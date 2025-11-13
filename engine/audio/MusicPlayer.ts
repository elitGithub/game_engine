// engine/audio/MusicPlayer.ts
import type { EventBus } from '@engine/core/EventBus';
import type { AssetManager } from '@engine/systems/AssetManager';
import type {ILogger, ITimerProvider} from '@engine/interfaces';

export type MusicState = 'playing' | 'paused' | 'stopped';

export interface MusicTrack {
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    gainNode: GainNode;
    startTime: number;
    pausedAt: number;
    duration: number;
    fadeOutTimer?: unknown;
}

/**
 * MusicPlayer - Handles all state and logic for music playback.
 */
export class MusicPlayer {
    private static readonly MILLISECONDS_PER_SECOND = 1000;
    private static readonly DEFAULT_CROSSFADE_DURATION_SECONDS = 2;

    private currentMusic: MusicTrack | null = null;
    private musicState: MusicState = 'stopped';

    constructor(
        private audioContext: AudioContext,
        private assetManager: AssetManager,
        private eventBus: EventBus,
        private outputNode: GainNode, // Connects to the main 'musicGain'
        private timer: ITimerProvider,
        private logger: ILogger,
    ) {}

    async playMusic(trackId: string, loop: boolean = true, fadeInDuration: number = 0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(trackId);
            if (!buffer) {
                throw new Error(`[MusicPlayer] Asset '${trackId}' not found. Was it preloaded?`);
            }

            if (this.currentMusic) {
                await this.stopMusic(0);
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = buffer;
            source.loop = loop;
            source.connect(gainNode);
            gainNode.connect(this.outputNode);

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
            this.logger.error(`[MusicPlayer] Failed to play music '${trackId}':`, error);
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
            this.timer.clearTimeout(this.currentMusic.fadeOutTimer);
            this.currentMusic.fadeOutTimer = undefined;
        }

        if (fadeOutDuration > 0 && this.currentMusic.source) {
            const currentTime = this.audioContext.currentTime;
            this.currentMusic.gainNode.gain.setValueAtTime(this.currentMusic.gainNode.gain.value, currentTime);
            this.currentMusic.gainNode.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration);

            this.currentMusic.fadeOutTimer = this.timer.setTimeout(() => {
                if (this.currentMusic?.source) {
                    this.currentMusic.source.stop();
                    this.currentMusic.source = null;
                }
                this.currentMusic = null;
                this.musicState = 'stopped';
            }, fadeOutDuration * MusicPlayer.MILLISECONDS_PER_SECOND);
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

    async crossfadeMusic(newTrackId: string, duration: number = MusicPlayer.DEFAULT_CROSSFADE_DURATION_SECONDS): Promise<void> {
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

    dispose(): void {
        this.stopMusic(0);
    }
}