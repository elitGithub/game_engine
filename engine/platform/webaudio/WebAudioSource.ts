/**
 * WebAudioSource - Wraps native AudioBufferSourceNode
 */

import type { IAudioSource, IAudioDestination, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import { WebAudioDestination } from '@engine/platform/webaudio/WebAudioDestination';
import { WebAudioGain } from './WebAudioGain';

export class WebAudioSource implements IAudioSource {
    private playing = false;
    private endedCallback: (() => void) | null = null;

    constructor(private native: AudioBufferSourceNode) {
        this.native.onended = () => {
            this.playing = false;
            if (this.endedCallback) {
                this.endedCallback();
            }
        };
    }

    start(when: number = 0, offset?: number, duration?: number): void {
        this.native.start(when, offset, duration);
        this.playing = true;
    }

    stop(when: number = 0): void {
        this.native.stop(when);
        this.playing = false;
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
