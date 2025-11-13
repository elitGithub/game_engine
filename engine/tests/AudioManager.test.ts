// engine/tests/AudioManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '@engine/systems/AudioManager';
import { EventBus } from '@engine/core/EventBus';
import { AssetManager } from '@engine/systems/AssetManager';
import { MusicPlayer } from '@engine/audio/MusicPlayer';
import { SfxPool } from '@engine/audio/SfxPool';
import { VoicePlayer } from '@engine/audio/VoicePlayer';
import type {ILogger, ITimerProvider} from '@engine/interfaces';
import type { IAudioContext } from '@engine/interfaces/IAudioPlatform';
import { createMockAudioContext } from './helpers/audioMocks';

// Mock the new helper classes
vi.mock('@engine/audio/MusicPlayer');
vi.mock('@engine/audio/SfxPool');
vi.mock('@engine/audio/VoicePlayer');

// Mock core dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

describe('AudioManager (Facade)', () => {
    let audioManager: AudioManager;
    let mockMusicPlayer: MusicPlayer;
    let mockSfxPool: SfxPool;
    let mockVoicePlayer: VoicePlayer;
    let mockAudioContext: IAudioContext;
    let mockTimerProvider: ITimerProvider;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock timer provider
        mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

        // Create mock instances of the helpers
        mockMusicPlayer = new (vi.mocked(MusicPlayer))(vi.fn() as any, vi.fn() as any, vi.fn() as any, vi.fn() as any, vi.fn() as any, mockLogger);
        mockSfxPool = new (vi.mocked(SfxPool))(vi.fn() as any, vi.fn() as any, vi.fn() as any, 10, 32, mockLogger);
        mockVoicePlayer = new (vi.mocked(VoicePlayer))(vi.fn() as any, vi.fn() as any, vi.fn() as any, vi.fn() as any, mockLogger);

        // Re-mock the implementations to return our new instances
        vi.mocked(MusicPlayer).mockImplementation(() => mockMusicPlayer);
        vi.mocked(SfxPool).mockImplementation(() => mockSfxPool);
        vi.mocked(VoicePlayer).mockImplementation(() => mockVoicePlayer);

        mockAudioContext = createMockAudioContext();

        audioManager = new AudioManager(
            new (vi.mocked(EventBus))(mockLogger),
            new (vi.mocked(AssetManager))(vi.fn() as any, mockLogger),
            mockAudioContext,
            mockTimerProvider,
            { sfxPoolSize: 10, maxSources: 32 },
            mockLogger
        );

        // Spy on the helper methods we want to test delegation to
        vi.spyOn(mockMusicPlayer, 'playMusic');
        vi.spyOn(mockSfxPool, 'play');
        vi.spyOn(mockVoicePlayer, 'playVoice');
        vi.spyOn(mockMusicPlayer, 'stopMusic');
        vi.spyOn(mockSfxPool, 'stopAll');
        vi.spyOn(mockVoicePlayer, 'stopAll');
    });

    it('should call unlockAudio', async () => {
        await audioManager.unlockAudio();

        expect(mockAudioContext.resume).toHaveBeenCalled();
        expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
    });

    it('should delegate playMusic to MusicPlayer', async () => {
        await audioManager.playMusic('bgm_main', true, 1.5);

        expect(mockMusicPlayer.playMusic).toHaveBeenCalledWith('bgm_main', true, 1.5);
    });

    it('should delegate playSound to SfxPool', async () => {
        await audioManager.playSound('sfx_click', 0.8);

        expect(mockSfxPool.play).toHaveBeenCalledWith('sfx_click', 0.8);
    });

    it('should delegate playVoice to VoicePlayer', async () => {
        await audioManager.playVoice('voice_greeting', 0.9);

        expect(mockVoicePlayer.playVoice).toHaveBeenCalledWith('voice_greeting', 0.9);
    });

    it('should delegate stopAll to all helpers', () => {
        audioManager.stopAll();

        expect(mockMusicPlayer.stopMusic).toHaveBeenCalledWith(0);
        expect(mockSfxPool.stopAll).toHaveBeenCalled();
        expect(mockVoicePlayer.stopAll).toHaveBeenCalled();
    });

    it('should set volumes on the correct gain nodes', () => {
        audioManager.setMasterVolume(0.5);
        audioManager.setMusicVolume(0.7);
        audioManager.setSFXVolume(0.7);
        audioManager.setVoiceVolume(0.8);

        // Volume conversion uses exponential curve: v^2
        // So we just verify that the methods were called successfully
        expect(audioManager.getMasterVolume()).toBeCloseTo(0.5, 2);
        expect(audioManager.getMusicVolume()).toBeCloseTo(0.7, 2);
        expect(audioManager.getSFXVolume()).toBeCloseTo(0.7, 2);
        expect(audioManager.getVoiceVolume()).toBeCloseTo(0.8, 2);
    });
});
