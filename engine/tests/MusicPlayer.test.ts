// engine/audio/MusicPlayer.test.ts
import {describe, it, expect, beforeEach, vi, afterEach} from 'vitest';
import {MusicPlayer} from '@engine/audio/MusicPlayer';
import {EventBus} from '@engine/core/EventBus';
import {AssetManager} from '@engine/systems/AssetManager';
import {ILogger, ITimerProvider} from '@engine/interfaces';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain, IAudioDestination } from '@engine/interfaces/IAudioPlatform';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// Mock IAudioSource
const createMockSource = (): IAudioSource => ({
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    setLoop: vi.fn(),
    onEnded: vi.fn(),
});

// Mock IAudioGain
const createMockGain = (): IAudioGain => {
    let value = 1.0;
    return {
        getValue: vi.fn(() => value),
        setValue: vi.fn((v: number) => { value = v; }),
        fadeTo: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    };
};

// Mock IAudioBuffer
const createMockBuffer = (duration: number = 10.0): IAudioBuffer => ({
    duration,
    numberOfChannels: 2,
    sampleRate: 44100,
    length: duration * 44100,
});

// Mock IAudioContext
const createMockAudioContext = () => {
    let currentTime = 0;
    const mockDestination: IAudioDestination = { maxChannelCount: 2 };

    return {
        state: 'running' as const,
        sampleRate: 44100,
        get currentTime() { return currentTime; },
        resume: vi.fn(async () => {}),
        suspend: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
        createBuffer: vi.fn((_channels: number, length: number, sampleRate: number) => createMockBuffer(length / sampleRate)),
        decodeAudioData: vi.fn(async (_data: ArrayBuffer) => createMockBuffer()),
        createSource: vi.fn((_buffer: IAudioBuffer) => createMockSource()),
        createGain: vi.fn(() => createMockGain()),
        getDestination: vi.fn(() => mockDestination),
    } as IAudioContext;
};

describe('MusicPlayer', () => {
    let musicPlayer: MusicPlayer;
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: IAudioContext;
    let mockOutputGain: IAudioGain;
    let mockTimerProvider: ITimerProvider;
    let mockAudioBuffer: IAudioBuffer;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockEventBus = new EventBus(mockLogger);
        mockAssetManager = new AssetManager(mockEventBus, mockLogger);
        mockAudioContext = createMockAudioContext();
        mockOutputGain = createMockGain();
        mockAudioBuffer = createMockBuffer(10.0);

        // Mock timer provider to use Vitest's fake timers
        mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Setup mock asset
        vi.mocked(mockAssetManager.get).mockReturnValue(mockAudioBuffer);

        musicPlayer = new MusicPlayer(mockAudioContext, mockAssetManager, mockEventBus, mockOutputGain, mockTimerProvider, mockLogger);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should play music', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        expect(mockAssetManager.get).toHaveBeenCalledWith('track1');
        expect(mockAudioContext.createSource).toHaveBeenCalledWith(mockAudioBuffer);
        expect(mockAudioContext.createGain).toHaveBeenCalled();
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.started', { trackId: 'track1' });
    });

    it('should pause music', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        musicPlayer.pauseMusic();

        expect(mockEventBus.emit).toHaveBeenCalledWith('music.paused', {});
        expect(musicPlayer.getMusicState()).toBe('paused');
    });

    it('should resume music', async () => {
        await musicPlayer.playMusic('track1', true, 0);
        musicPlayer.pauseMusic();

        musicPlayer.resumeMusic();

        expect(mockEventBus.emit).toHaveBeenCalledWith('music.resumed', {});
        expect(musicPlayer.getMusicState()).toBe('playing');
    });

    it('should stop music', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        await musicPlayer.stopMusic(0);

        expect(mockEventBus.emit).toHaveBeenCalledWith('music.stopped', {});
        expect(musicPlayer.getMusicState()).toBe('stopped');
    });

    it('should stop music with fade out', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        const stopPromise = musicPlayer.stopMusic(1.0);

        // Fast-forward time
        vi.advanceTimersByTime(1000);

        await stopPromise;

        expect(mockEventBus.emit).toHaveBeenCalledWith('music.stopped', {});
    });

    it('should crossfade to new track', async () => {
        const track2Buffer = createMockBuffer(8.0); // Different buffer for track2
        vi.mocked(mockAssetManager.get).mockImplementation((id: string) => {
            if (id === 'track2') return track2Buffer;
            return mockAudioBuffer;
        });

        await musicPlayer.playMusic('track1', true, 0);
        vi.mocked(mockEventBus.emit).mockClear(); // Clear the 'music.started' call from first play

        await musicPlayer.crossfadeMusic('track2', 2);

        // Should emit music.stopped, music.started, and music.crossfaded
        expect(mockEventBus.emit).toHaveBeenCalledWith('music.crossfaded', { newTrackId: 'track2', duration: 2 });
    });

    it('should get music position', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        const position = musicPlayer.getMusicPosition();

        expect(position).toBeGreaterThanOrEqual(0);
    });

    it('should set music position', async () => {
        await musicPlayer.playMusic('track1', true, 0);

        musicPlayer.setMusicPosition(5.0);

        // After pause/resume, position should be at 5 seconds
        expect(musicPlayer.getMusicState()).toBe('playing');
    });
});
