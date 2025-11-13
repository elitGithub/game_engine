// engine/systems/AudioManager.ts
import type { EventBus } from '../core/EventBus';
import type { AssetManager } from './AssetManager';
import type {AudioManagerOptions, ILogger, ITimerProvider} from '@engine/interfaces';
import type { IAudioContext, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import { MusicPlayer, type MusicState } from '@engine/audio/MusicPlayer';
import { SfxPool } from '@engine/audio/SfxPool';
import { VoicePlayer } from '@engine/audio/VoicePlayer';
import { AudioUtils } from '@engine/audio/AudioUtils';

/**
 * AudioManager - A facade for coordinating audio playback.
 *
 * Delegates all playback logic to specialized classes:
 * - MusicPlayer: Handles stateful background music.
 * - SfxPool: Handles pooled, "fire-and-forget" sound effects.
 * - VoicePlayer: Handles non-pooled voice-over playback.
 */
export class AudioManager {
    // Gain nodes for volume control
    private masterGain: IAudioGain;
    private musicGain: IAudioGain;
    private sfxGain: IAudioGain;
    private voiceGain: IAudioGain;

    // Specialized helper classes
    private musicPlayer: MusicPlayer;
    private sfxPool: SfxPool;
    private voicePlayer: VoicePlayer;

    // State
    private isUnlocked: boolean;

    constructor(
        private eventBus: EventBus,
        private assetManager: AssetManager,
        private readonly audioContext: IAudioContext,
        timer: ITimerProvider,
        options: AudioManagerOptions,
        private logger: ILogger
    ) {

        // Create gain nodes
        this.masterGain = this.audioContext.createGain();
        this.musicGain = this.audioContext.createGain();
        this.sfxGain = this.audioContext.createGain();
        this.voiceGain = this.audioContext.createGain();

        // Connect gain hierarchy: music/sfx/voice -> master -> destination
        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.voiceGain.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.getDestination());

        // Instantiate helpers
        this.musicPlayer = new MusicPlayer(audioContext, this.assetManager, eventBus, this.musicGain, timer, this.logger);
        this.sfxPool = new SfxPool(audioContext, this.assetManager, this.sfxGain, options.sfxPoolSize, this.logger);
        this.voicePlayer = new VoicePlayer(audioContext, this.assetManager, eventBus, this.voiceGain, this.logger);

        // Initialize state
        this.isUnlocked = false;

        // Set initial volumes (use provided values or sensible defaults)
        // Defaults chosen for typical game balance:
        // - Master: 1.0 (full volume control to user)
        // - Music: 0.7 (background, not overpowering)
        // - SFX: 0.8 (prominent but not jarring)
        // - Voice: 1.0 (dialogue should be clear)
        const defaultVolumes = { master: 1.0, music: 0.7, sfx: 0.8, voice: 1.0 };
        const volumes = { ...defaultVolumes, ...options.volumes };

        this.setMasterVolume(volumes.master);
        this.setMusicVolume(volumes.music);
        this.setSFXVolume(volumes.sfx);
        this.setVoiceVolume(volumes.voice);
    }

    /**
     * Unlock audio playback by resuming the audio context.
     * Required on most browsers before any audio can play due to autoplay policies.
     * Call this in response to a user interaction (click, touch, etc.).
     * Emits 'audio.unlocked' event on success.
     *
     * @returns Promise that resolves when audio is unlocked
     */
    async unlockAudio(): Promise<void> {
        if (this.isUnlocked) return;

        try {
            await this.audioContext.resume();

            // Play a silent buffer to unlock the audio context
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createSource(buffer);
            source.connect(this.audioContext.getDestination());
            source.start(0);

            this.isUnlocked = true;
            this.eventBus.emit('audio.unlocked', {});
        } catch (error) {
            this.logger.error('[AudioManager] Failed to unlock audio:', error);
        }
    }

    // ============================================================================
    // VOLUME CONTROLS
    // ============================================================================

    /**
     * Set the master volume level for all audio.
     * Affects music, sound effects, and voice simultaneously.
     * Uses exponential curve to compensate for logarithmic human hearing.
     *
     * @param level - Linear volume level between 0.0 (silent) and 1.0 (full volume)
     */
    setMasterVolume(level: number): void {
        this.masterGain.setValue(AudioUtils.toGain(level));
    }

    /**
     * Set the music volume level.
     * Only affects background music playback.
     * Uses exponential curve to compensate for logarithmic human hearing.
     *
     * @param level - Linear volume level between 0.0 (silent) and 1.0 (full volume)
     */
    setMusicVolume(level: number): void {
        this.musicGain.setValue(AudioUtils.toGain(level));
    }

    /**
     * Set the sound effects volume level.
     * Only affects SFX playback.
     * Uses exponential curve to compensate for logarithmic human hearing.
     *
     * @param level - Linear volume level between 0.0 (silent) and 1.0 (full volume)
     */
    setSFXVolume(level: number): void {
        this.sfxGain.setValue(AudioUtils.toGain(level));
    }

    /**
     * Set the voice volume level.
     * Only affects voice-over playback.
     * Uses exponential curve to compensate for logarithmic human hearing.
     *
     * @param level - Linear volume level between 0.0 (silent) and 1.0 (full volume)
     */
    setVoiceVolume(level: number): void {
        this.voiceGain.setValue(AudioUtils.toGain(level));
    }

    /**
     * Get the current master volume level.
     * Converts from exponential gain back to linear volume for display.
     *
     * @returns Current linear master volume between 0.0 and 1.0
     */
    getMasterVolume(): number {
        return AudioUtils.toVolume(this.masterGain.getValue());
    }

    /**
     * Get the current music volume level.
     * Converts from exponential gain back to linear volume for display.
     *
     * @returns Current linear music volume between 0.0 and 1.0
     */
    getMusicVolume(): number {
        return AudioUtils.toVolume(this.musicGain.getValue());
    }

    /**
     * Get the current sound effects volume level.
     * Converts from exponential gain back to linear volume for display.
     *
     * @returns Current linear SFX volume between 0.0 and 1.0
     */
    getSFXVolume(): number {
        return AudioUtils.toVolume(this.sfxGain.getValue());
    }

    /**
     * Get the current voice volume level.
     * Converts from exponential gain back to linear volume for display.
     *
     * @returns Current linear voice volume between 0.0 and 1.0
     */
    getVoiceVolume(): number {
        return AudioUtils.toVolume(this.voiceGain.getValue());
    }

    // ============================================================================
    // MUSIC CONTROLS (DELEGATED)
    // ============================================================================

    /**
     * Play a music track from the asset cache.
     * Emits 'music.started' event when playback begins.
     *
     * @param trackId - Asset ID of the music track to play
     * @param loop - Whether to loop the track continuously (default: true)
     * @param fadeInDuration - Duration in seconds to fade in the music (default: 0)
     * @returns Promise that resolves when playback starts
     */
    async playMusic(trackId: string, loop: boolean = true, fadeInDuration: number = 0): Promise<void> {
        return this.musicPlayer.playMusic(trackId, loop, fadeInDuration);
    }

    /**
     * Pause the currently playing music track.
     * Use resumeMusic() to continue playback from the same position.
     * Emits 'music.paused' event.
     */
    pauseMusic(): void {
        this.musicPlayer.pauseMusic();
    }

    /**
     * Resume the currently paused music track.
     * Continues playback from where it was paused.
     * Emits 'music.resumed' event.
     */
    resumeMusic(): void {
        this.musicPlayer.resumeMusic();
    }

    /**
     * Stop the currently playing music track.
     * Emits 'music.stopped' event when stopped.
     *
     * @param fadeOutDuration - Duration in seconds to fade out before stopping (default: 0)
     * @returns Promise that resolves when music has stopped
     */
    async stopMusic(fadeOutDuration: number = 0): Promise<void> {
        return this.musicPlayer.stopMusic(fadeOutDuration);
    }

    /**
     * Smoothly transition from current music to a new track.
     * Fades out current track while fading in the new track.
     * Emits 'music.crossfade' event when transition completes.
     *
     * @param newTrackId - Asset ID of the new music track to play
     * @param duration - Duration in seconds for the crossfade transition (default: 2)
     * @returns Promise that resolves when crossfade completes
     */
    async crossfadeMusic(newTrackId: string, duration: number = 2): Promise<void> {
        return this.musicPlayer.crossfadeMusic(newTrackId, duration);
    }

    /**
     * Get the current state of the music player.
     *
     * @returns Current music state (stopped, playing, or paused)
     */
    getMusicState(): MusicState {
        return this.musicPlayer.getMusicState();
    }

    /**
     * Get the current playback position of the music track.
     *
     * @returns Current position in seconds
     */
    getMusicPosition(): number {
        return this.musicPlayer.getMusicPosition();
    }

    /**
     * Set the playback position of the current music track.
     * Use this to seek to a specific time in the track.
     *
     * @param seconds - Position in seconds to seek to
     */
    setMusicPosition(seconds: number): void {
        this.musicPlayer.setMusicPosition(seconds);
    }

    // ============================================================================
    // SFX & VOICE CONTROLS (DELEGATED)
    // ============================================================================

    /**
     * Play a sound effect from the asset cache.
     * Sound effects are pooled and fire-and-forget. Multiple sounds can play simultaneously.
     *
     * @param soundId - Asset ID of the sound effect to play
     * @param volume - Volume level for this specific sound (default: 1.0)
     * @returns Promise that resolves when sound starts playing
     */
    async playSound(soundId: string, volume: number = 1.0): Promise<void> {
        return this.sfxPool.play(soundId, volume);
    }

    /**
     * Play a voice-over clip from the asset cache.
     * Voice clips are non-pooled and can be controlled individually.
     * Emits 'voice.started' and 'voice.ended' events.
     *
     * @param voiceId - Asset ID of the voice clip to play
     * @param volume - Volume level for this specific voice clip (default: 1.0)
     * @returns Promise that resolves when voice starts playing
     */
    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        return this.voicePlayer.playVoice(voiceId, volume);
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    /**
     * Get the audio context for advanced operations.
     * Use this for platform-agnostic audio operations not covered by AudioManager.
     *
     * @returns The platform-agnostic audio context
     */
    public getAudioContext(): IAudioContext {
        return this.audioContext;
    }

    /**
     * Stop all currently playing audio immediately.
     * Stops music, sound effects, and voice clips.
     * Emits 'audio.allStopped' event.
     */
    stopAll(): void {
        this.musicPlayer.stopMusic(0);
        this.sfxPool.stopAll();
        this.voicePlayer.stopAll();

        this.eventBus.emit('audio.allStopped', {});
    }

    /**
     * Clean up and release all audio resources.
     * Stops all audio, disposes all players, and closes the audio context.
     * Call this when shutting down the audio system.
     */
    async dispose(): Promise<void> {
        this.stopAll();
        this.musicPlayer.dispose();
        this.sfxPool.dispose();
        this.voicePlayer.dispose();

        if (this.audioContext.state !== 'closed') {
            await this.audioContext.close();
        }
    }
}