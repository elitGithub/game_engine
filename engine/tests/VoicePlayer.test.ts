// engine/audio/VoicePlayer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoicePlayer } from '@engine/audio/VoicePlayer';
import { EventBus } from '@engine/core/EventBus';
import { AssetManager } from '@engine/systems/AssetManager';
import {ILogger} from "@engine/interfaces";

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

// Mock browser Audio API components
const createMockBufferSource = () => ({
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null as (() => void) | null,
    buffer: null as AudioBuffer | null,
    loop: false,
});

let mockBufferSource = createMockBufferSource();

const mockGainNode = {
    connect: vi.fn(),
    gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    },
};

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// Mock AudioContext
const MockAudioContext = vi.fn(() => ({
    createGain: vi.fn(() => mockGainNode),
    createBufferSource: vi.fn(() => {
        mockBufferSource = createMockBufferSource();
        return mockBufferSource;
    }),
    destination: {},
    currentTime: 0,
    state: 'running',
}));

// Mock AudioBuffer
const mockAudioBuffer = {
    duration: 3.0
} as AudioBuffer;


describe('VoicePlayer', () => {
    let voicePlayer: VoicePlayer;
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: any;
    let mockOutputGain: GainNode;

    beforeEach(() => {
        vi.clearAllMocks();

        mockEventBus = new EventBus(mockLogger);
        mockAssetManager = new AssetManager(mockEventBus);
        mockAudioContext = new MockAudioContext();
        mockOutputGain = mockAudioContext.createGain(); // This is the 'voiceGain'

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        voicePlayer = new VoicePlayer(mockAudioContext, mockAssetManager, mockEventBus, mockOutputGain);
    });

    it('should play a voice line', async () => {
        await voicePlayer.playVoice('voice_line_1', 0.9);

        expect(mockAssetManager.get).toHaveBeenCalledWith('voice_line_1');
        expect(mockBufferSource.buffer).toBe(mockAudioBuffer);
        expect(mockGainNode.gain.value).toBe(0.9);
        expect(mockBufferSource.start).toHaveBeenCalledWith(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('voice.started', { voiceId: 'voice_line_1' });
    });

    it('should not pool voice lines', async () => {
        await voicePlayer.playVoice('voice_line_1');
        const source1 = mockBufferSource;
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);

        // Manually trigger onended
        if(source1.onended) source1.onended();
        expect(source1.disconnect).toHaveBeenCalledOnce();

        await voicePlayer.playVoice('voice_line_2');
        // A new source is created
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);
    });

    // --- NEW TEST ---
    it('should stop all active voices', async () => {
        await voicePlayer.playVoice('voice_line_1');
        const source1 = mockBufferSource;

        await voicePlayer.playVoice('voice_line_2');
        const source2 = mockBufferSource;

        voicePlayer.stopAll();

        expect(source1.stop).toHaveBeenCalledOnce();
        expect(source1.onended).toBe(null); // onended is cleared
        expect(source2.stop).toHaveBeenCalledOnce();
        expect(source2.onended).toBe(null);
    });

    // --- NEW TEST ---
    it('should dispose (which calls stopAll)', () => {
        const stopAllSpy = vi.spyOn(voicePlayer, 'stopAll');
        voicePlayer.dispose();
        expect(stopAllSpy).toHaveBeenCalledOnce();
    });
});