// engine/tests/AudioManager.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AudioManager } from '@engine/systems/AudioManager';
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
    disconnect: vi.fn(), // <-- ADD THIS LINE
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
    createBuffer: vi.fn(),
    resume: vi.fn(() => Promise.resolve()),
    suspend: vi.fn(() => Promise.resolve()),
    destination: {},
    currentTime: 0,
    state: 'running',
    close: vi.fn(() => Promise.resolve()),
}));

// Mock AudioBuffer
const mockAudioBuffer = {
    duration: 10.0 // 10 seconds
} as AudioBuffer;


describe('AudioManager', () => {
    let audioManager: AudioManager;
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: any; // Use 'any' for the mock class

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers(); // Use fake timers for fades/timeouts

        mockEventBus = new EventBus();
        mockAssetManager = new AssetManager(mockEventBus);
        mockAudioContext = new MockAudioContext();

        // Reset spies on mock objects
        mockBufferSource.start.mockClear();
        mockBufferSource.stop.mockClear();
        mockBufferSource.connect.mockClear();
        mockGainNode.connect.mockClear();
        mockGainNode.gain.linearRampToValueAtTime.mockClear();

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        audioManager = new AudioManager(mockEventBus, mockAssetManager, mockAudioContext);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should unlock audio on first interaction', async () => {
        await audioManager.unlockAudio();

        expect(mockAudioContext.resume).toHaveBeenCalledOnce();
        expect(mockBufferSource.start).toHaveBeenCalledOnce(); // For the silent buffer
        expect(mockEventBus.emit).toHaveBeenCalledWith('audio.unlocked', {});
    });

    describe('Music', () => {
        it('should play music', async () => {
            await audioManager.playMusic('track1', true, 0);

            expect(mockAssetManager.get).toHaveBeenCalledWith('track1');
            expect(mockBufferSource.buffer).toBe(mockAudioBuffer);
            expect(mockBufferSource.loop).toBe(true);
            expect(mockBufferSource.start).toHaveBeenCalledWith(0);
            expect(mockEventBus.emit).toHaveBeenCalledWith('music.started', { trackId: 'track1' });
        });

        it('should stop existing music when playing a new track', async () => {
            await audioManager.playMusic('track1');
            // Store the first buffer source
            const firstSourceStop = vi.spyOn(mockBufferSource, 'stop');

            await audioManager.playMusic('track2');

            // Check that the first track was stopped
            expect(firstSourceStop).toHaveBeenCalledOnce();
            // Check that the new track was started
            expect(mockBufferSource.start).toHaveBeenCalledWith(0);
            expect(mockEventBus.emit).toHaveBeenCalledWith('music.started', { trackId: 'track2' });
        });

        it('should pause and resume music', async () => {
            await audioManager.playMusic('track1');

            // Simulate time passing
            mockAudioContext.currentTime = 5.0; // 5 seconds in
            audioManager.pauseMusic();

            expect(mockBufferSource.stop).toHaveBeenCalledOnce();
            expect(audioManager.getMusicState()).toBe('paused');
            expect(audioManager.getMusicPosition()).toBeCloseTo(5.0);
            expect(mockEventBus.emit).toHaveBeenCalledWith('music.paused', {});

            // Resume
            audioManager.resumeMusic();
            expect(mockBufferSource.start).toHaveBeenCalledWith(0, 5.0); // Resumes from 5s
            expect(audioManager.getMusicState()).toBe('playing');
        });

        it('should stop music with a fade-out', async () => {
            await audioManager.playMusic('track1');

            await audioManager.stopMusic(2.0); // 2-second fade

            // Check if fade was initiated
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, mockAudioContext.currentTime + 2.0);

            // Fast-forward time
            vi.advanceTimersByTime(2000); // 2000 ms

            expect(mockBufferSource.stop).toHaveBeenCalledOnce();
            expect(audioManager.getMusicState()).toBe('stopped');
            expect(mockEventBus.emit).toHaveBeenCalledWith('music.stopped', {});
        });

        it.todo('should crossfade music correctly');
        it.todo('should set music position correctly when paused');
        it.todo('should set music position correctly when playing');
    });

    describe('SFX Pooling', () => {
        it('should play a sound', async () => {
            await audioManager.playSound('sfx_laser', 0.8);

            expect(mockAssetManager.get).toHaveBeenCalledWith('sfx_laser');
            expect(mockBufferSource.buffer).toBe(mockAudioBuffer);
            expect(mockGainNode.gain.value).toBe(0.8);
            expect(mockBufferSource.start).toHaveBeenCalledWith(0);
        });

        it('should create a new source if pool is empty', async () => {
            await audioManager.playSound('sfx_laser');
            expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1); // Plus 1 for unlockAudio
        });

        it('should return a source to the pool onended', async () => {
            await audioManager.playSound('sfx_laser');

            // Manually trigger the onended callback
            expect(mockBufferSource.onended).toBeInstanceOf(Function);
            if(mockBufferSource.onended) {
                mockBufferSource.onended();
            }

            // Play again
            await audioManager.playSound('sfx_laser');

            // It should *not* have created a new source, but reused the pooled one
            // Note: The count is 2 (1 for unlock, 1 for first play). The second play reuses.
            // FIX: The count should be 1. clearAllMocks() runs before this test,
            // so the unlockAudio call doesn't count.
            expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(1);
        });

        it.todo('should play voice audio on the correct channel');
    });
});