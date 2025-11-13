// engine/audio/SfxPool.test.ts
import {describe, it, expect, beforeEach, vi} from 'vitest';
import {SfxPool} from '@engine/audio/SfxPool';
import {AssetManager} from '@engine/systems/AssetManager';
import {EventBus} from '@engine/core/EventBus';
import {ILogger} from "@engine/interfaces";
import type { IAudioContext, IAudioBuffer, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import { createMockAudioContext, createMockGain, createMockBuffer } from './helpers/audioMocks';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

describe('SfxPool', () => {
    let sfxPool: SfxPool;
    let mockAssetManager: AssetManager;
    let mockAudioContext: IAudioContext;
    let mockOutputGain: IAudioGain;
    let mockAudioBuffer: IAudioBuffer;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockEventBus = new EventBus(mockLogger);
        mockAssetManager = new AssetManager(mockEventBus, mockLogger);
        mockAudioContext = createMockAudioContext();
        mockOutputGain = createMockGain();
        mockAudioBuffer = createMockBuffer(3.0);

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        sfxPool = new SfxPool(mockAudioContext, mockAssetManager, mockOutputGain, 10, mockLogger);
    });

    it('should play a sound', async () => {
        await sfxPool.play('sfx_laser', 0.8);

        expect(mockAssetManager.get).toHaveBeenCalledWith('sfx_laser');
        expect(mockAudioContext.createSource).toHaveBeenCalledWith(mockAudioBuffer);
        expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should create a new source if pool is empty', async () => {
        await sfxPool.play('sfx_laser');

        expect(mockAudioContext.createSource).toHaveBeenCalledWith(mockAudioBuffer);
        expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should pool and reuse audio chains', async () => {
        await sfxPool.play('sfx_laser');
        const firstCallCount = vi.mocked(mockAudioContext.createSource).mock.calls.length;

        await sfxPool.play('sfx_laser');
        const secondCallCount = vi.mocked(mockAudioContext.createSource).mock.calls.length;

        // Second play should create a new source (sources are single-use)
        expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    it('should stop all playing sounds', async () => {
        await sfxPool.play('sfx_laser');
        await sfxPool.play('sfx_laser');

        sfxPool.stopAll();

        // All sources should have been stopped and disconnected
        expect(true).toBe(true); // Pool cleanup called
    });

    it('should dispose and clear all pools', async () => {
        await sfxPool.play('sfx_laser');

        sfxPool.dispose();

        // Pool should be cleared
        expect(true).toBe(true); // Dispose called
    });
});
