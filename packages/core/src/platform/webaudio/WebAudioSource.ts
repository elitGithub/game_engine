/**
 * WebAudioSource - Wraps native AudioBufferSourceNode
 */

import type { IAudioSource, IAudioDestination, IAudioGain } from '@game-engine/core/interfaces/IAudioPlatform';
import { WebAudioDestination } from '@game-engine/core/platform/webaudio/WebAudioDestination';
import { WebAudioGain } from './WebAudioGain';
import type { ILogger } from '@game-engine/core/interfaces';

export class WebAudioSource implements IAudioSource {
    private playing = false;
    private endedCallback: (() => void) | null = null;

    constructor(
        private readonly native: AudioBufferSourceNode,
        private readonly logger: ILogger
    ) {
        this.native.onended = () => {
            this.playing = false;
            if (this.endedCallback) {
                this.endedCallback();
            }
        };
    }

    start(when: number = 0, offset?: number, duration?: number): void {
        try {
            this.native.start(when, offset, duration);
            this.playing = true;
        } catch (e) {
            // Expected if already started - ignore
        }
    }

    stop(when: number = 0): void {
        try {
            this.native.stop(when);
            this.playing = false;
        } catch (e) {
            // Only log unexpected errors
            if (!(e instanceof DOMException && e.name === 'InvalidStateError')) {
                this.logger.warn('[WebAudioSource] Unexpected error on stop():', e);
            }
        }
    }

    setLoop(loop: boolean): void {
        this.native.loop = loop;
    }

    setLoopStart(start: number): void {
        this.native.loopStart = start;
    }

    setLoopEnd(end: number): void {
        this.native.loopEnd = end;
    }

    setPlaybackRate(rate: number): void {
        this.native.playbackRate.value = rate;
    }

    connect(destination: IAudioDestination | IAudioGain): void {
        if (destination instanceof WebAudioDestination) {
            this.native.connect(destination.getNative());
        } else if (destination instanceof WebAudioGain) {
            this.native.connect(destination.getNative());
        }
    }

    disconnect(): void {
        this.native.disconnect();
    }

    isPlaying(): boolean {
        return this.playing;
    }

    onEnded(callback: () => void): void {
        this.endedCallback = callback;
    }
}
