/**
 * AudioManager - Comprehensive audio management with Web Audio API
 *
 * Features:
 * - Separate volume controls (master, music, SFX, voice)
 * - Music control (play, pause, resume, stop, crossfade, seek)
 * - SFX pooling for performance
 * - Mobile audio unlock
 * - Configurable audio source adapter
 */
import type { AudioSourceAdapter, AudioAssetMap } from './AudioSourceAdapter';
import { LocalAudioSourceAdapter } from './LocalAudioSourceAdapter';
import type { EventBus } from './EventBus';

export type MusicState = 'playing' | 'paused' | 'stopped';

interface MusicTrack {
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    gainNode: GainNode;
    startTime: number;
    pausedAt: number;
    duration: number;
}

interface SFXPool {
    buffer: AudioBuffer;
    available: AudioBufferSourceNode[];
    maxSize: number;
}

export class AudioManager {
    private audioContext: AudioContext;
    private adapter: AudioSourceAdapter;
    private eventBus: EventBus;

    // Gain nodes for volume control
    private masterGain: GainNode;
    private musicGain: GainNode;
    private sfxGain: GainNode;
    private voiceGain: GainNode;

    // Music state
    private currentMusic: MusicTrack | null;
    private musicState: MusicState;
    private nextMusic: { trackId: string; fadeInDuration: number } | null;

    // SFX pooling
    private sfxPools: Map<string, SFXPool>;

    // State
    private isUnlocked: boolean;
    private loadedBuffers: Map<string, AudioBuffer>;

    constructor(eventBus: EventBus, adapter?: AudioSourceAdapter, assetMap?: AudioAssetMap) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.eventBus = eventBus;

        // Use provided adapter or create default
        this.adapter = adapter || new LocalAudioSourceAdapter(this.audioContext, assetMap || {});

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

        // Initialize state
        this.currentMusic = null;
        this.musicState = 'stopped';
        this.nextMusic = null;
        this.sfxPools = new Map();
        this.isUnlocked = false;
        this.loadedBuffers = new Map();

        // Set default volumes
        this.setMasterVolume(1.0);
        this.setMusicVolume(0.7);
        this.setSFXVolume(0.8);
        this.setVoiceVolume(1.0);
    }

    /**
     * Unlock audio on mobile (call on first user interaction)
     */
    async unlockAudio(): Promise<void> {
        if (this.isUnlocked) return;

        try {
            await this.audioContext.resume();

            // Play silent buffer to unlock
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

    /**
     * Preload audio assets
     */
    async preload(audioIds: string[]): Promise<void> {
        const promises = audioIds.map(async (id) => {
            try {
                const buffer = await this.adapter.load(id);
                this.loadedBuffers.set(id, buffer);
            } catch (error) {
                console.error(`[AudioManager] Failed to preload '${id}':`, error);
            }
        });

        await Promise.all(promises);
        this.eventBus.emit('audio.preloaded', { count: this.loadedBuffers.size });
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
    // MUSIC CONTROLS
    // ============================================================================

    async playMusic(trackId: string, loop: boolean = true, fadeInDuration: number = 0): Promise<void> {
        try {
            const buffer = await this.getOrLoadBuffer(trackId);

            // Stop current music if playing
            if (this.currentMusic) {
                await this.stopMusic(0);
            }

            // Create new track
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.loop = loop;
            source.connect(gainNode);
            gainNode.connect(this.musicGain);

            // Fade in if requested
            if (fadeInDuration > 0) {
                gainNode.gain.value = 0;
                gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + fadeInDuration);
            } else {
                gainNode.gain.value = 1;
            }

            source.start(0);

            this.currentMusic = {
                buffer,
                source,
                gainNode,
                startTime: this.audioContext.currentTime,
                pausedAt: 0,
                duration: buffer.duration
            };

            this.musicState = 'playing';
            this.eventBus.emit('music.started', { trackId });
        } catch (error) {
            console.error(`[AudioManager] Failed to play music '${trackId}':`, error);
        }
    }

    pauseMusic(): void {
        if (!this.currentMusic || this.musicState !== 'playing') return;

        const elapsed = this.audioContext.currentTime - this.currentMusic.startTime;
        this.currentMusic.pausedAt = elapsed;

        if (this.currentMusic.source) {
            this.currentMusic.source.stop();
            this.currentMusic.source = null;
        }

        this.musicState = 'paused';
        this.eventBus.emit('music.paused', {});
    }

    resumeMusic(): void {
        if (!this.currentMusic || this.musicState !== 'paused') return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.currentMusic.buffer;
        source.loop = true;
        source.connect(this.currentMusic.gainNode);

        // Resume from paused position
        source.start(0, this.currentMusic.pausedAt);

        this.currentMusic.source = source;
        this.currentMusic.startTime = this.audioContext.currentTime - this.currentMusic.pausedAt;
        this.musicState = 'playing';

        this.eventBus.emit('music.resumed', {});
    }

    async stopMusic(fadeOutDuration: number = 0): Promise<void> {
        if (!this.currentMusic) return;

        if (fadeOutDuration > 0 && this.currentMusic.source) {
            const currentTime = this.audioContext.currentTime;
            this.currentMusic.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

            // Stop after fade
            setTimeout(() => {
                if (this.currentMusic?.source) {
                    this.currentMusic.source.stop();
                    this.currentMusic.source = null;
                }
                this.currentMusic = null;
                this.musicState = 'stopped';
            }, fadeOutDuration * 1000);
        } else {
            if (this.currentMusic.source) {
                this.currentMusic.source.stop();
                this.currentMusic.source = null;
            }
            this.currentMusic = null;
            this.musicState = 'stopped';
        }

        this.eventBus.emit('music.stopped', {});
    }

    async crossfadeMusic(newTrackId: string, duration: number = 2): Promise<void> {
        // Start fading out current music
        if (this.currentMusic) {
            this.stopMusic(duration);
        }

        // Start fading in new music
        await this.playMusic(newTrackId, true, duration);

        this.eventBus.emit('music.crossfaded', { newTrackId, duration });
    }

    getMusicState(): MusicState {
        return this.musicState;
    }

    getMusicPosition(): number {
        if (!this.currentMusic) return 0;

        if (this.musicState === 'playing') {
            return this.audioContext.currentTime - this.currentMusic.startTime;
        } else if (this.musicState === 'paused') {
            return this.currentMusic.pausedAt;
        }

        return 0;
    }

    setMusicPosition(seconds: number): void {
        if (!this.currentMusic) return;

        const wasPlaying = this.musicState === 'playing';

        // Stop current source
        if (this.currentMusic.source) {
            this.currentMusic.source.stop();
        }

        // Create new source at new position
        const source = this.audioContext.createBufferSource();
        source.buffer = this.currentMusic.buffer;
        source.loop = true;
        source.connect(this.currentMusic.gainNode);
        source.start(0, seconds);

        this.currentMusic.source = source;
        this.currentMusic.startTime = this.audioContext.currentTime - seconds;
        this.currentMusic.pausedAt = seconds;

        if (wasPlaying) {
            this.musicState = 'playing';
        }
    }

    // ============================================================================
    // SFX CONTROLS
    // ============================================================================

    async playSound(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = await this.getOrLoadBuffer(soundId);

            // Try to get from pool first
            let source = this.getFromPool(soundId);

            if (!source) {
                source = this.audioContext.createBufferSource();
                source.buffer = buffer;
            }

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            source.connect(gainNode);
            gainNode.connect(this.sfxGain);

            source.onended = () => {
                this.returnToPool(soundId, source!);
            };

            source.start(0);
        } catch (error) {
            console.error(`[AudioManager] Failed to play sound '${soundId}':`, error);
        }
    }

    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = await this.getOrLoadBuffer(voiceId);

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            source.connect(gainNode);
            gainNode.connect(this.voiceGain);

            source.start(0);

            this.eventBus.emit('voice.started', { voiceId });
        } catch (error) {
            console.error(`[AudioManager] Failed to play voice '${voiceId}':`, error);
        }
    }

    // ============================================================================
    // SFX POOLING
    // ============================================================================

    private getFromPool(soundId: string): AudioBufferSourceNode | null {
        const pool = this.sfxPools.get(soundId);
        if (!pool || pool.available.length === 0) return null;

        return pool.available.pop()!;
    }

    private returnToPool(soundId: string, source: AudioBufferSourceNode): void {
        let pool = this.sfxPools.get(soundId);

        if (!pool) {
            pool = {
                buffer: source.buffer!,
                available: [],
                maxSize: 5
            };
            this.sfxPools.set(soundId, pool);
        }

        if (pool.available.length < pool.maxSize) {
            // Create new source for pool
            const newSource = this.audioContext.createBufferSource();
            newSource.buffer = pool.buffer;
            pool.available.push(newSource);
        }
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    private async getOrLoadBuffer(audioId: string): Promise<AudioBuffer> {
        if (this.loadedBuffers.has(audioId)) {
            return this.loadedBuffers.get(audioId)!;
        }

        const buffer = await this.adapter.load(audioId);
        this.loadedBuffers.set(audioId, buffer);
        return buffer;
    }

    /**
     * Stop all audio
     */
    stopAll(): void {
        this.stopMusic(0);
        this.eventBus.emit('audio.allStopped', {});
    }

    /**
     * Dispose and clean up
     */
    dispose(): void {
        this.stopAll();
        this.sfxPools.clear();
        this.loadedBuffers.clear();
        this.audioContext.close();
    }
}