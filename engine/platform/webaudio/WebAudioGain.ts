/**
 * WebAudioGain - Wraps native GainNode
 */

import type { IAudioGain, IAudioDestination } from '@engine/interfaces/IAudioPlatform';
import { WebAudioDestination } from './WebAudioDestination';

export class WebAudioGain implements IAudioGain {
    constructor(private native: GainNode) {}

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

    connect(destination: IAudioDestination): void {
        if (destination instanceof WebAudioDestination) {
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
