// engine/audio/SfxPool.memory.test.ts
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {SfxPool} from '@engine/audio/SfxPool';
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

describe('SfxPool - Memory Leak Verification', () => {
    let sfxPool: SfxPool;
    let mockAssetManager: AssetManager;
    let mockAudioContext: IAudioContext;
    let mockOutputGain: IAudioGain;
    let mockAudioBuffer: IAudioBuffer;
    let createdSources: (IAudioSource & { simulateEnd: () => void })[];

    beforeEach(() => {
        vi.clearAllMocks();
        createdSources = [];

        const mockEventBus = new EventBus(mockLogger);
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

        sfxPool = new SfxPool(mockAudioContext, mockAssetManager, mockOutputGain, 5, mockLogger);
    });

    it('should register onEnded callback when playing a sound', async () => {
        await sfxPool.play('sfx_laser');

        expect(createdSources.length).toBe(1);
        expect(createdSources[0].onEnded).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should recycle audio chains when sound completes naturally', async () => {
        // Play first sound
        await sfxPool.play('sfx_laser');
        const firstSource = createdSources[0];

        // At this point, we should have created 1 source and 1 gain
        expect(mockAudioContext.createSource).toHaveBeenCalledTimes(1);
        expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1);

        // Simulate the sound finishing
        firstSource.simulateEnd();

        // Play second sound - should reuse the gain node from the pool
        await sfxPool.play('sfx_laser');

        // Should create a new source (sources are single-use in Web Audio)
        // but should NOT create a new gain (that should be reused from pool)
        expect(mockAudioContext.createSource).toHaveBeenCalledTimes(2);
        expect(mockAudioContext.createGain).toHaveBeenCalledTimes(1); // Still 1 - reused!
    });

    it('should not leak memory with many sequential plays', async () => {
        const playCount = 20;

        for (let i = 0; i < playCount; i++) {
            await sfxPool.play('sfx_laser');
            // Simulate each sound finishing immediately
            if (createdSources[i]) {
                createdSources[i].simulateEnd();
            }
        }

        // Should have created 20 sources (single-use)
        expect(mockAudioContext.createSource).toHaveBeenCalledTimes(playCount);

        // Should have created far fewer gains due to pooling (max pool size is 5)
        // First 5 creates new gains, then they get recycled
        const gainCallCount = vi.mocked(mockAudioContext.createGain).mock.calls.length;
        expect(gainCallCount).toBeLessThanOrEqual(5); // Should be 5 or less
    });

    it('should respect max pool size and disconnect excess chains', async () => {
        const maxPoolSize = 5;
        const playCount = 10;

        // Play and complete 10 sounds
        for (let i = 0; i < playCount; i++) {
            await sfxPool.play('sfx_laser');
            createdSources[i].simulateEnd();
        }

        // After 10 plays, we should have at most maxPoolSize gains created
        // The rest should have been recycled
        const gainCallCount = vi.mocked(mockAudioContext.createGain).mock.calls.length;
        expect(gainCallCount).toBeLessThanOrEqual(maxPoolSize);
    });

    it('should handle concurrent plays without leaking', async () => {
        // Play 3 sounds concurrently
        await Promise.all([
            sfxPool.play('sfx_laser'),
            sfxPool.play('sfx_laser'),
            sfxPool.play('sfx_laser'),
        ]);

        expect(createdSources.length).toBe(3);

        // Simulate all finishing
        createdSources.forEach(source => source.simulateEnd());

        // Play 3 more
        await Promise.all([
            sfxPool.play('sfx_laser'),
            sfxPool.play('sfx_laser'),
            sfxPool.play('sfx_laser'),
        ]);

        // Should have created 6 sources total (single-use)
        expect(mockAudioContext.createSource).toHaveBeenCalledTimes(6);

        // But only 3 gains (recycled from pool)
        expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3);
    });
});
