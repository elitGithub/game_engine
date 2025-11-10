// engine/audio/SfxPool.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SfxPool } from '@engine/audio/SfxPool';
import { AssetManager } from '@engine/systems/AssetManager';
import { EventBus } from '@engine/core/EventBus';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

// Mock browser Audio API components
// We need a factory to create *multiple* mock sources
const createMockBufferSource = () => ({
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onended: null as (() => void) | null,
    buffer: null as AudioBuffer | null,
    loop: false,
});

let lastCreatedMockBufferSource = createMockBufferSource();

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
    createBufferSource: vi.fn(() => {
        lastCreatedMockBufferSource = createMockBufferSource();
        return lastCreatedMockBufferSource;
    }),
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

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        sfxPool = new SfxPool(mockAudioContext, mockAssetManager, mockOutputGain);
    });

    it('should play a sound', async () => {
        await sfxPool.play('sfx_laser', 0.8);

        expect(mockAssetManager.get).toHaveBeenCalledWith('sfx_laser');
        expect(lastCreatedMockBufferSource.buffer).toBe(mockAudioBuffer);
        expect(mockGainNode.gain.value).toBe(0.8);
        expect(lastCreatedMockBufferSource.start).toHaveBeenCalledWith(0);
    });

    it('should create a new source if pool is empty', async () => {
        await sfxPool.play('sfx_laser');
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
    });

    it('should return a source to the pool onended', async () => {
        await sfxPool.play('sfx_laser');
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
        const firstSource = lastCreatedMockBufferSource;

        // Manually trigger the onended callback
        expect(firstSource.onended).toBeInstanceOf(Function);
        if (firstSource.onended) {
            firstSource.onended();
        }

        // Check that disconnect was called
        expect(firstSource.disconnect).toHaveBeenCalledOnce();

        // Play again
        await sfxPool.play('sfx_laser');

        // It should *not* have created a new source, but reused the pooled one
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
        // We can't easily test *which* source was used without inspecting internals.
        // The fact that createBufferSource wasn't called again is the main test.
    });

    // --- NEW TEST ---
    it('should respect maxSize pool limit', async () => {
        // Set maxSize to 1 for this test
        (sfxPool as any).pools.set('sfx_laser', {
            buffer: mockAudioBuffer,
            available: [],
            maxSize: 1
        });

        // Play sound 1, it's created
        await sfxPool.play('sfx_laser');
        const source1 = lastCreatedMockBufferSource;
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);

        // Play sound 2, it's created
        await sfxPool.play('sfx_laser');
        const source2 = lastCreatedMockBufferSource;
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);

        // Sound 1 finishes and returns to pool
        if (source1.onended) source1.onended();

        // Sound 2 finishes and tries to return, but pool is full
        if (source2.onended) source2.onended();

        // Play sound 3, it should reuse source 1
        await sfxPool.play('sfx_laser');
        expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2); // No new source

        // The last source *started* should be source1 (reused from pool).
        // `lastCreatedMockBufferSource` still points to source2, which is wrong.
        expect(source1.start).toHaveBeenCalledTimes(2); // source1 was started twice
        expect(source2.start).toHaveBeenCalledTimes(1); // source2 was started once
    });

    // --- NEW TEST ---
    it('should stop all active sounds', async () => {
        await sfxPool.play('sfx_laser');
        const source1 = lastCreatedMockBufferSource;

        await sfxPool.play('sfx_laser');
        const source2 = lastCreatedMockBufferSource;

        sfxPool.stopAll();

        expect(source1.stop).toHaveBeenCalledOnce();
        expect(source1.onended).toBe(null); // onended is cleared
        expect(source2.stop).toHaveBeenCalledOnce();
        expect(source2.onended).toBe(null);
    });

    // --- NEW TEST ---
    it('should dispose and clear pools', async () => {
        await sfxPool.play('sfx_laser');
        const source1 = lastCreatedMockBufferSource;
        if(source1.onended) source1.onended(); // Return to pool

        sfxPool.dispose();

        expect(source1.stop).not.toHaveBeenCalled(); // stopAll only stops *active* sources
        expect((sfxPool as any).pools.size).toBe(0); // Pools are cleared
    });
});