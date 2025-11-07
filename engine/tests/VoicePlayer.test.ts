// engine/audio/VoicePlayer.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoicePlayer } from '@engine/audio/VoicePlayer';
import { EventBus } from '@engine/core/EventBus';
import { AssetManager } from '@engine/systems/AssetManager';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

// Mock browser Audio API components
const mockBufferSource = {
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null as (() => void) | null,
    buffer: null as AudioBuffer | null,
    loop: false,
};

const mockGainNode = {
    connect: vi.fn(),
    gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    },
};

// Mock AudioContext
const MockAudioContext = vi.fn(() => ({
    createGain: vi.fn(() => mockGainNode),
    createBufferSource: vi.fn(() => mockBufferSource),
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

        mockEventBus = new EventBus();
        mockAssetManager = new AssetManager(mockEventBus);
        mockAudioContext = new MockAudioContext();
        mockOutputGain = mockAudioContext.createGain(); // This is the 'voiceGain'

        // Reset spies on mock objects
        mockBufferSource.start.mockClear();
        mockBufferSource.stop.mockClear();
        mockBufferSource.connect.mockClear();
        mockBufferSource.disconnect.mockClear();
        mockGainNode.connect.mockClear();

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
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);

        // Manually trigger onended
        if(mockBufferSource.onended) mockBufferSource.onended();
        expect(mockBufferSource.disconnect).toHaveBeenCalledOnce();

        await voicePlayer.playVoice('voice_line_2');
        // A new source is created
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);
    });
});