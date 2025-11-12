// engine/systems/AudioManager.ts
import type { EventBus } from '../core/EventBus';
import type { AssetManager } from './AssetManager';
import type {AudioManagerOptions, ITimerProvider} from '@engine/interfaces';
import { MusicPlayer, type MusicState } from '@engine/audio/MusicPlayer';
import { SfxPool } from '@engine/audio/SfxPool';
import { VoicePlayer } from '@engine/audio/VoicePlayer';

/**
 * AudioManager - A facade for coordinating audio playback.
 *
 * Delegates all playback logic to specialized classes:
 * - MusicPlayer: Handles stateful background music.
 * - SfxPool: Handles pooled, "fire-and-forget" sound effects.
 * - VoicePlayer: Handles non-pooled voice-over playback.
 */
export class AudioManager {
    private audioContext: AudioContext;
    private assetManager: AssetManager;
    private eventBus: EventBus;

    // Gain nodes for volume control
    private masterGain: GainNode;
    private musicGain: GainNode;
    private sfxGain: GainNode;
    private voiceGain: GainNode;

    // Specialized helper classes
    private musicPlayer: MusicPlayer;
    private sfxPool: SfxPool;
    private voicePlayer: VoicePlayer;

    // State
    private isUnlocked: boolean;

    constructor(
        eventBus: EventBus,
        assetManager: AssetManager,
        audioContext: AudioContext,
        timer: ITimerProvider,
        options: AudioManagerOptions
    ) {
        this.eventBus = eventBus;
        this.assetManager = assetManager;
        this.audioContext = audioContext;

        // Create gain nodes
        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();
        this.voiceGain = this.audioContext.createGain();

        // Connect gain hierarchy: music/sfx/voice -> master -> destination
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        // Instantiate helpers
        this.musicPlayer = new MusicPlayer(audioContext, assetManager, eventBus, this.musicGain, timer);
        this.sfxPool = new SfxPool(audioContext, assetManager, this.sfxGain, options.sfxPoolSize);
        this.voicePlayer = new VoicePlayer(audioContext, assetManager, eventBus, this.voiceGain);

        // Initialize state
        this.isUnlocked = false;

        // Set default volumes
        this.setMasterVolume(1.0);
        this.setMusicVolume(0.7);
        this.setSFXVolume(0.8);
        this.setVoiceVolume(1.0);
    }

    async unlockAudio(): Promise<void> {
        if (this.isUnlocked) return;

        try {
            await this.audioContext.resume();

            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);

            this.isUnlocked = true;
            this.eventBus.emit('audio.unlocked', {});
        } catch (error) {
            console.error('[AudioManager] Failed to unlock audio:', error);
        }
    }

    // ============================================================================
    // VOLUME CONTROLS
    // ============================================================================

    setMasterVolume(level: number): void {
        this.masterGain.gain.value = Math.max(0, Math.min(1, level));
    }

    setMusicVolume(level: number): void {
        this.musicGain.gain.value = Math.max(0, Math.min(1, level));
    }

    setSFXVolume(level: number): void {
        this.sfxGain.gain.value = Math.max(0, Math.min(1, level));
    }

    setVoiceVolume(level: number): void {
        this.voiceGain.gain.value = Math.max(0, Math.min(1, level));
    }

    getMasterVolume(): number {
        return this.masterGain.gain.value;
    }

    getMusicVolume(): number {
        return this.musicGain.gain.value;
    }

    getSFXVolume(): number {
        return this.sfxGain.gain.value;
    }

    getVoiceVolume(): number {
        return this.voiceGain.gain.value;
    }

    // ============================================================================
    // MUSIC CONTROLS (DELEGATED)
    // ============================================================================

    async playMusic(trackId: string, loop: boolean = true, fadeInDuration: number = 0): Promise<void> {
        return this.musicPlayer.playMusic(trackId, loop, fadeInDuration);
    }

    pauseMusic(): void {
        this.musicPlayer.pauseMusic();
    }

    resumeMusic(): void {
        this.musicPlayer.resumeMusic();
    }

    async stopMusic(fadeOutDuration: number = 0): Promise<void> {
        return this.musicPlayer.stopMusic(fadeOutDuration);
    }

    async crossfadeMusic(newTrackId: string, duration: number = 2): Promise<void> {
        return this.musicPlayer.crossfadeMusic(newTrackId, duration);
    }

    getMusicState(): MusicState {
        return this.musicPlayer.getMusicState();
    }

    getMusicPosition(): number {
        return this.musicPlayer.getMusicPosition();
    }

    setMusicPosition(seconds: number): void {
        this.musicPlayer.setMusicPosition(seconds);
    }

    // ============================================================================
    // SFX & VOICE CONTROLS (DELEGATED)
    // ============================================================================

    async playSound(soundId: string, volume: number = 1.0): Promise<void> {
        return this.sfxPool.play(soundId, volume);
    }

    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        return this.voicePlayer.playVoice(voiceId, volume);
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    public getAudioContext(): AudioContext {
        return this.audioContext;
    }

    stopAll(): void {
        this.musicPlayer.stopMusic(0);
        this.sfxPool.stopAll();
        this.voicePlayer.stopAll();

        this.eventBus.emit('audio.allStopped', {});
    }

    dispose(): void {
        this.stopAll();
        this.musicPlayer.dispose();
        this.sfxPool.dispose();
        this.voicePlayer.dispose();

        if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}