// engine/systems/AudioManager.ts
import type { EventBus } from '../core/EventBus';
import type { AssetManager } from './AssetManager';

export type MusicState = 'playing' | 'paused' | 'stopped';

interface MusicTrack {
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    gainNode: GainNode;
    startTime: number;
    pausedAt: number;
    duration: number;
    fadeOutTimer?: number;
}

interface SFXPool {
    buffer: AudioBuffer;
    available: AudioBufferSourceNode[];
    maxSize: number;
}

export class AudioManager {
    private audioContext: AudioContext;
    private assetManager: AssetManager;
    private eventBus: EventBus;

    // Gain nodes for volume control
    private masterGain: GainNode;
    private musicGain: GainNode;
    private sfxGain: GainNode;
    private voiceGain: GainNode;

    // Music state
    private currentMusic: MusicTrack | null;
    private musicState: MusicState;

    // SFX pooling
    private sfxPools: Map<string, SFXPool>;

    // State
    private isUnlocked: boolean;

    constructor(
        eventBus: EventBus,
        assetManager: AssetManager,
        audioContext: AudioContext
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

        // Initialize state
        this.currentMusic = null;
        this.musicState = 'stopped';
        this.sfxPools = new Map();
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
    // MUSIC CONTROLS
    // ============================================================================

    async playMusic(trackId: string, loop: boolean = true, fadeInDuration: number = 0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(trackId);
            if (!buffer) {
                throw new Error(`[AudioManager] Asset '${trackId}' not found. Was it preloaded?`);
            }

            if (this.currentMusic) {
                await this.stopMusic(0);
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.loop = loop;
            source.connect(gainNode);
            gainNode.connect(this.musicGain);

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
        this.currentMusic.pausedAt = elapsed % this.currentMusic.duration; // Store position

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
        source.loop = true; // Assuming music always loops, adjust if needed
        source.connect(this.currentMusic.gainNode);

        const offset = this.currentMusic.pausedAt;
        source.start(0, offset);

        this.currentMusic.source = source;
        this.currentMusic.startTime = this.audioContext.currentTime - offset;
        this.musicState = 'playing';

        this.eventBus.emit('music.resumed', {});
    }

    async stopMusic(fadeOutDuration: number = 0): Promise<void> {
        if (!this.currentMusic) return;

        if (this.currentMusic.fadeOutTimer !== undefined) {
            clearTimeout(this.currentMusic.fadeOutTimer);
            this.currentMusic.fadeOutTimer = undefined;
        }

        if (fadeOutDuration > 0 && this.currentMusic.source) {
            const currentTime = this.audioContext.currentTime;
            this.currentMusic.gainNode.gain.setValueAtTime(this.currentMusic.gainNode.gain.value, currentTime);
            this.currentMusic.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

            this.currentMusic.fadeOutTimer = window.setTimeout(() => {
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
        if (this.currentMusic && this.currentMusic.buffer === this.assetManager.get(newTrackId)) {
            return; // Don't crossfade to the same track
        }

        this.stopMusic(duration);
        await this.playMusic(newTrackId, true, duration);
        this.eventBus.emit('music.crossfaded', { newTrackId, duration });
    }

    getMusicState(): MusicState {
        return this.musicState;
    }

    getMusicPosition(): number {
        if (!this.currentMusic) return 0;

        if (this.musicState === 'playing') {
            return (this.audioContext.currentTime - this.currentMusic.startTime) % this.currentMusic.duration;
        } else if (this.musicState === 'paused') {
            return this.currentMusic.pausedAt;
        }

        return 0;
    }

    setMusicPosition(seconds: number): void {
        if (!this.currentMusic) return;

        const wasPlaying = this.musicState === 'playing';
        if (wasPlaying) {
            this.pauseMusic();
        }

        const newTime = Math.max(0, seconds) % this.currentMusic.duration;
        this.currentMusic.pausedAt = newTime;
        this.currentMusic.startTime = this.audioContext.currentTime - newTime; // This will be used if resumed

        if (wasPlaying) {
            this.resumeMusic();
        }
    }

    // ============================================================================
    // SFX CONTROLS
    // ============================================================================

    async playSound(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(soundId);
            if (!buffer) {
                throw new Error(`[AudioManager] Asset '${soundId}' not found. Was it preloaded?`);
            }

            let source = this.getFromPool(soundId, buffer);

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            source.connect(gainNode);
            gainNode.connect(this.sfxGain);

            source.onended = () => {
                this.returnToPool(soundId, source);
            };

            source.start(0);
        } catch (error) {
            console.error(`[AudioManager] Failed to play sound '${soundId}':`, error);
        }
    }

    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(voiceId);
            if (!buffer) {
                throw new Error(`[AudioManager] Asset '${voiceId}' not found. Was it preloaded?`);
            }

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

    private getFromPool(soundId: string, buffer: AudioBuffer): AudioBufferSourceNode {
        let pool = this.sfxPools.get(soundId);
        if (!pool) {
            pool = {
                buffer: buffer,
                available: [],
                maxSize: 5
            };
            this.sfxPools.set(soundId, pool);
        }

        if (pool.available.length > 0) {
            return pool.available.pop()!;
        }

        // Create a new one if pool is empty
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    private returnToPool(soundId: string, source: AudioBufferSourceNode): void {
        const pool = this.sfxPools.get(soundId);

        // Disconnect to prevent memory leaks
        source.disconnect();
        source.onended = null;

        if (pool && pool.available.length < pool.maxSize) {
            pool.available.push(source);
        }
        // If pool is full, the source node is just left for garbage collection.
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    public getAudioContext(): AudioContext {
        return this.audioContext;
    }

    stopAll(): void {
        this.stopMusic(0);
        // TODO: Add logic to stop all active SFX/voice if needed
        this.eventBus.emit('audio.allStopped', {});
    }

    dispose(): void {
        this.stopAll();
        this.sfxPools.clear();
        if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}