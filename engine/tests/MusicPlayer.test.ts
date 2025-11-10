// engine/audio/MusicPlayer.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MusicPlayer } from '@engine/audio/MusicPlayer';
import { EventBus } from '@engine/core/EventBus';
import { AssetManager } from '@engine/systems/AssetManager';
import type { ITimerProvider } from '@engine/interfaces';

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
    duration: 10.0 // 10 seconds
} as AudioBuffer;


describe('MusicPlayer', () => {
    let musicPlayer: MusicPlayer;
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: any;
    let mockOutputGain: GainNode;
    let mockTimerProvider: ITimerProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockEventBus = new EventBus();
        mockAssetManager = new AssetManager(mockEventBus);
        mockAudioContext = new MockAudioContext();
        mockOutputGain = mockAudioContext.createGain(); // This is the 'musicGain'

        // Mock timer provider to use Vitest's fake timers
        mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

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

        musicPlayer = new MusicPlayer(mockAudioContext, mockAssetManager, mockEventBus, mockOutputGain, mockTimerProvider);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should play music', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        expect(mockAssetManager.get).toHaveBeenCalledWith('track1');
        expect(mockBufferSource.buffer).toBe(mockAudioBuffer);
        expect(mockBufferSource.loop).toBe(true);
        expect(mockBufferSource.start).toHaveBeenCalledWith(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.started', { trackId: 'track1' });
    });

    it('should stop existing music when playing a new track', async () => {
        await musicPlayer.playMusic('track1');
        const firstSourceStop = vi.spyOn(mockBufferSource, 'stop');

        await musicPlayer.playMusic('track2');

        expect(firstSourceStop).toHaveBeenCalledOnce();
        expect(mockBufferSource.start).toHaveBeenCalledWith(0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.started', { trackId: 'track2' });
    });

    it('should pause and resume music', async () => {
        await musicPlayer.playMusic('track1');

        mockAudioContext.currentTime = 5.0; // 5 seconds in
        musicPlayer.pauseMusic();

        expect(mockBufferSource.stop).toHaveBeenCalledOnce();
        expect(musicPlayer.getMusicState()).toBe('paused');
        expect(musicPlayer.getMusicPosition()).toBeCloseTo(5.0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.paused', {});

        // Resume
        musicPlayer.resumeMusic();
        expect(mockBufferSource.start).toHaveBeenCalledWith(0, 5.0); // Resumes from 5s
        expect(musicPlayer.getMusicState()).toBe('playing');
    });

    it('should stop music with a fade-out', async () => {
        await musicPlayer.playMusic('track1');

        await musicPlayer.stopMusic(2.0); // 2-second fade

        expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, mockAudioContext.currentTime + 2.0);

        vi.advanceTimersByTime(2000); // 2000 ms

        expect(mockBufferSource.stop).toHaveBeenCalledOnce();
        expect(musicPlayer.getMusicState()).toBe('stopped');
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.stopped', {});
    });

    // --- NEW TEST ---
    it('should crossfade music', async () => {
        // Mock a different buffer for the new track
        const mockAudioBuffer2 = { duration: 10.0 } as AudioBuffer;
        vi.mocked(mockAssetManager.get).mockReturnValueOnce(mockAudioBuffer).mockReturnValueOnce(mockAudioBuffer2);

        await musicPlayer.playMusic('track1');
        vi.clearAllMocks();

        // Spy on the public methods
        const stopSpy = vi.spyOn(musicPlayer, 'stopMusic').mockResolvedValue();
        const playSpy = vi.spyOn(musicPlayer, 'playMusic').mockResolvedValue();

        await musicPlayer.crossfadeMusic('track2', 1.5);

        expect(stopSpy).toHaveBeenCalledWith(1.5);
        expect(playSpy).toHaveBeenCalledWith('track2', true, 1.5);
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.crossfaded', { newTrackId: 'track2', duration: 1.5 });
    });

    // --- NEW TEST ---
    it('should get music position', async () => {
        await musicPlayer.playMusic('track1');

        // State: playing
        mockAudioContext.currentTime = 5.0;
        // Manually set internal state for test
        (musicPlayer as any).currentMusic.startTime = 0.0;

        expect(musicPlayer.getMusicPosition()).toBeCloseTo(5.0);

        // State: paused
        musicPlayer.pauseMusic(); // This sets pausedAt
        mockAudioContext.currentTime = 8.0; // Time moves on, but position should be stored

        expect(musicPlayer.getMusicState()).toBe('paused');
        expect(musicPlayer.getMusicPosition()).toBeCloseTo(5.0); // Stays at paused position
    });

    // --- NEW TEST ---
    it('should set music position while playing', async () => {
        await musicPlayer.playMusic('track1');

        const pauseSpy = vi.spyOn(musicPlayer, 'pauseMusic');
        const resumeSpy = vi.spyOn(musicPlayer, 'resumeMusic');

        musicPlayer.setMusicPosition(3.0);

        expect(pauseSpy).toHaveBeenCalledOnce();
        expect((musicPlayer as any).currentMusic.pausedAt).toBe(3.0);
        expect(resumeSpy).toHaveBeenCalledOnce();
    });

    // --- NEW TEST ---
    it('should set music position while paused', async () => {
        await musicPlayer.playMusic('track1');
        musicPlayer.pauseMusic(); // state is now 'paused'

        const pauseSpy = vi.spyOn(musicPlayer, 'pauseMusic');
        const resumeSpy = vi.spyOn(musicPlayer, 'resumeMusic');

        musicPlayer.setMusicPosition(4.0);

        expect(pauseSpy).not.toHaveBeenCalled(); // Was already paused
        expect((musicPlayer as any).currentMusic.pausedAt).toBe(4.0);
        expect(resumeSpy).not.toHaveBeenCalled(); // Stays paused
    });
});