// engine/audio/SfxPool.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SfxPool } from '@engine/audio/SfxPool';
import { AssetManager } from '@engine/systems/AssetManager';
import { EventBus } from '@engine/core/EventBus';

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


describe('SfxPool', () => {
    let sfxPool: SfxPool;
    let mockAssetManager: AssetManager;
    let mockAudioContext: any;
    let mockOutputGain: GainNode;

    beforeEach(() => {
        vi.clearAllMocks();

        const mockEventBus = new EventBus();
        mockAssetManager = new AssetManager(mockEventBus);
        mockAudioContext = new MockAudioContext();
        mockOutputGain = mockAudioContext.createGain(); // This is the 'sfxGain'

        // Reset spies on mock objects
        mockBufferSource.start.mockClear();
        mockBufferSource.stop.mockClear();
        mockBufferSource.connect.mockClear();
        mockBufferSource.disconnect.mockClear();
        mockGainNode.connect.mockClear();

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        sfxPool = new SfxPool(mockAudioContext, mockAssetManager, mockOutputGain);
    });

    it('should play a sound', async () => {
        await sfxPool.play('sfx_laser', 0.8);

        expect(mockAssetManager.get).toHaveBeenCalledWith('sfx_laser');
        expect(mockBufferSource.buffer).toBe(mockAudioBuffer);
        expect(mockGainNode.gain.value).toBe(0.8);
        expect(mockBufferSource.start).toHaveBeenCalledWith(0);
    });

    it('should create a new source if pool is empty', async () => {
        await sfxPool.play('sfx_laser');
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('should return a source to the pool onended', async () => {
        await sfxPool.play('sfx_laser');
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);

        // Manually trigger the onended callback
        expect(mockBufferSource.onended).toBeInstanceOf(Function);
        if (mockBufferSource.onended) {
            mockBufferSource.onended();
        }

        // Check that disconnect was called
        expect(mockBufferSource.disconnect).toHaveBeenCalledOnce();

        // Play again
        await sfxPool.play('sfx_laser');

        // It should *not* have created a new source, but reused the pooled one
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
    });
});