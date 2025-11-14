/**
 * WebAudioGain - Wraps native GainNode
 */

import type { IAudioGain, IAudioDestination } from '@engine/interfaces/IAudioPlatform';
import { WebAudioDestination } from '@engine/platform/webaudio/WebAudioDestination';

export class WebAudioGain implements IAudioGain {
    constructor(private readonly native: GainNode) {}

    getValue(): number {
        return this.native.gain.value;
    }

    setValue(value: number): void {
        this.native.gain.value = value;
    }

    fadeTo(value: number, duration: number): void {
        const now = this.native.context.currentTime;
        this.native.gain.linearRampToValueAtTime(value, now + duration);
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

    getNative(): GainNode {
        return this.native;
    }
}
