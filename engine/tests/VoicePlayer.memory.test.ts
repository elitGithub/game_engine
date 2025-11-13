// engine/audio/VoicePlayer.memory.test.ts
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {VoicePlayer} from '@engine/audio/VoicePlayer';
import {AssetManager} from '@engine/systems/AssetManager';
import {EventBus} from '@engine/core/EventBus';
import type {ILogger} from "@engine/interfaces";
import type { IAudioContext, IAudioBuffer, IAudioGain, IAudioSource } from '@engine/interfaces/IAudioPlatform';
import { createMockGain, createMockBuffer } from './helpers/audioMocks';

vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

/**
 * Create a controllable mock source that can simulate completion
 */
const createControllableSource = (): IAudioSource & { simulateEnd: () => void } => {
    let endedCallback: (() => void) | null = null;

    return {
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        setLoop: vi.fn(),
        onEnded: vi.fn((cb: () => void) => { endedCallback = cb; }),
        simulateEnd: () => { if (endedCallback) endedCallback(); }
    };
};

describe('VoicePlayer - Memory Leak Verification', () => {
    let voicePlayer: VoicePlayer;
    let mockAssetManager: AssetManager;
    let mockAudioContext: IAudioContext;
    let mockEventBus: EventBus;
    let mockOutputGain: IAudioGain;
    let mockAudioBuffer: IAudioBuffer;
    let createdSources: (IAudioSource & { simulateEnd: () => void })[];

    beforeEach(() => {
        vi.clearAllMocks();
        createdSources = [];

        mockEventBus = new EventBus(mockLogger);
        mockAssetManager = new AssetManager(mockEventBus, mockLogger);
        mockOutputGain = createMockGain();
        mockAudioBuffer = createMockBuffer(3.0);

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        // Create mock audio context that tracks sources
        mockAudioContext = {
            state: 'running' as const,
            sampleRate: 44100,
            currentTime: 0,
            resume: vi.fn(async () => {}),
            suspend: vi.fn(async () => {}),
            close: vi.fn(async () => {}),
            createBuffer: vi.fn(),
            decodeAudioData: vi.fn(),
            createSource: vi.fn((_buffer: IAudioBuffer) => {
                const source = createControllableSource();
                createdSources.push(source);
                return source;
            }),
            createGain: vi.fn(() => createMockGain()),
            getDestination: vi.fn(() => ({ maxChannelCount: 2 })),
        } as IAudioContext;

        voicePlayer = new VoicePlayer(mockAudioContext, mockAssetManager, mockEventBus, mockOutputGain, mockLogger);
    });

    it('should register onEnded callback when playing a voice', async () => {
        await voicePlayer.playVoice('voice_greeting');

        expect(createdSources.length).toBe(1);
        expect(createdSources[0].onEnded).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should remove voice from activeVoices when playback completes', async () => {
        // Use reflection to check internal state (only for memory leak verification)
        const getActiveCount = () => (voicePlayer as any).activeVoices.size;

        // Play voice
        await voicePlayer.playVoice('voice_greeting');
        expect(getActiveCount()).toBe(1);

        // Simulate completion
        createdSources[0].simulateEnd();

        // Should be removed from active set
        expect(getActiveCount()).toBe(0);
    });

    it('should not leak memory with many sequential voice plays', async () => {
        const playCount = 50;
        const getActiveCount = () => (voicePlayer as any).activeVoices.size;

        for (let i = 0; i < playCount; i++) {
            await voicePlayer.playVoice('voice_greeting');
            // Simulate each voice finishing immediately
            createdSources[i].simulateEnd();
        }

        // activeVoices should be empty after all voices finish
        expect(getActiveCount()).toBe(0);

        // All sources should have been created (no pooling for voices)
        expect(mockAudioContext.createSource).toHaveBeenCalledTimes(playCount);
    });

    it('should handle concurrent voices and clean them up', async () => {
        const getActiveCount = () => (voicePlayer as any).activeVoices.size;

        // Play 5 voices concurrently
        await Promise.all([
            voicePlayer.playVoice('voice1'),
            voicePlayer.playVoice('voice2'),
            voicePlayer.playVoice('voice3'),
            voicePlayer.playVoice('voice4'),
            voicePlayer.playVoice('voice5'),
        ]);

        expect(getActiveCount()).toBe(5);

        // Finish first 3
        createdSources[0].simulateEnd();
        createdSources[1].simulateEnd();
        createdSources[2].simulateEnd();

        expect(getActiveCount()).toBe(2);

        // Finish remaining 2
        createdSources[3].simulateEnd();
        createdSources[4].simulateEnd();

        expect(getActiveCount()).toBe(0);
    });

    it('should emit voice.ended event when voice completes naturally', async () => {
        const emitSpy = vi.spyOn(mockEventBus, 'emit');

        await voicePlayer.playVoice('voice_greeting');
        createdSources[0].simulateEnd();

        expect(emitSpy).toHaveBeenCalledWith('voice.ended', { voiceId: 'voice_greeting' });
    });

    it('should disconnect source and gain when voice completes', async () => {
        await voicePlayer.playVoice('voice_greeting');
        const source = createdSources[0];

        source.simulateEnd();

        expect(source.disconnect).toHaveBeenCalled();
    });
});
