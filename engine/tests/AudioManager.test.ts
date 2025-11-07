// engine/tests/AudioManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '@engine/systems/AudioManager';
import { EventBus } from '@engine/core/EventBus';
import { AssetManager } from '@engine/systems/AssetManager';
import { MusicPlayer } from '@engine/audio/MusicPlayer';
import { SfxPool } from '@engine/audio/SfxPool';
import { VoicePlayer } from '@engine/audio/VoicePlayer';

// Mock the new helper classes
vi.mock('@engine/audio/MusicPlayer');
vi.mock('@engine/audio/SfxPool');
vi.mock('@engine/audio/VoicePlayer');

// Mock core dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/AssetManager');

// Mock browser Audio API components
const mockGainNode = {
    connect: vi.fn(),
    gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
    },
};

const MockAudioContext = vi.fn(() => ({
    createGain: vi.fn(() => mockGainNode),
    createBuffer: vi.fn(),
    createBufferSource: vi.fn(() => ({
        start: vi.fn(),
        connect: vi.fn(),
    })),
    resume: vi.fn(() => Promise.resolve()),
    destination: {},
    currentTime: 0,
}));

describe('AudioManager (Facade)', () => {
    let audioManager: AudioManager;
    let mockMusicPlayer: MusicPlayer;
    let mockSfxPool: SfxPool;
    let mockVoicePlayer: VoicePlayer;
    let mockAudioContext: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock instances of the helpers
        mockMusicPlayer = new (vi.mocked(MusicPlayer))(vi.fn() as any, vi.fn() as any, vi.fn() as any, vi.fn() as any);
        mockSfxPool = new (vi.mocked(SfxPool))(vi.fn() as any, vi.fn() as any, vi.fn() as any);
        mockVoicePlayer = new (vi.mocked(VoicePlayer))(vi.fn() as any, vi.fn() as any, vi.fn() as any, vi.fn() as any);

        // Re-mock the implementations to return our new instances
        vi.mocked(MusicPlayer).mockImplementation(() => mockMusicPlayer);
        vi.mocked(SfxPool).mockImplementation(() => mockSfxPool);
        vi.mocked(VoicePlayer).mockImplementation(() => mockVoicePlayer);

        mockAudioContext = new MockAudioContext();

        audioManager = new AudioManager(
            new (vi.mocked(EventBus))(),
            new (vi.mocked(AssetManager))(vi.fn() as any),
            mockAudioContext
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
        expect(mockAudioContext.resume).toHaveBeenCalledOnce();
    });

    it('should delegate playMusic to MusicPlayer', async () => {
        await audioManager.playMusic('track1', true, 1);
        expect(mockMusicPlayer.playMusic).toHaveBeenCalledWith('track1', true, 1);
    });

    it('should delegate playSound to SfxPool', async () => {
        await audioManager.playSound('sfx1', 0.8);
        expect(mockSfxPool.play).toHaveBeenCalledWith('sfx1', 0.8);
    });

    it('should delegate playVoice to VoicePlayer', async () => {
        await audioManager.playVoice('voice1', 1.0);
        expect(mockVoicePlayer.playVoice).toHaveBeenCalledWith('voice1', 1.0);
    });

    it('should delegate stopAll to all helpers', () => {
        audioManager.stopAll();
        expect(mockMusicPlayer.stopMusic).toHaveBeenCalledWith(0);
        expect(mockSfxPool.stopAll).toHaveBeenCalledOnce();
        expect(mockVoicePlayer.stopAll).toHaveBeenCalledOnce();
    });

    it('should set volumes on the correct gain nodes', () => {
        // AudioContext.createGain is called 4 times in constructor
        // [0] = master, [1] = music, [2] = sfx, [3] = voice
        const masterGain = vi.mocked(mockAudioContext.createGain).mock.results[0].value.gain;
        const musicGain = vi.mocked(mockAudioContext.createGain).mock.results[1].value.gain;
        const sfxGain = vi.mocked(mockAudioContext.createGain).mock.results[2].value.gain;
        const voiceGain = vi.mocked(mockAudioContext.createGain).mock.results[3].value.gain;

        audioManager.setMasterVolume(0.5);
        expect(masterGain.value).toBe(0.5);

        audioManager.setMusicVolume(0.6);
        expect(musicGain.value).toBe(0.6);

        audioManager.setSFXVolume(0.7);
        expect(sfxGain.value).toBe(0.7);

        audioManager.setVoiceVolume(0.8);
        expect(voiceGain.value).toBe(0.8);
    });
});