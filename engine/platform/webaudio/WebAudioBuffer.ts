/**
 * WebAudioBuffer - Wraps native AudioBuffer
 */

import type { IAudioBuffer } from '@engine/interfaces/IAudioPlatform';

export class WebAudioBuffer implements IAudioBuffer {
    constructor(private readonly native: AudioBuffer) {}

    get duration(): number {
        return this.native.duration;
    }

    get numberOfChannels(): number {
        return this.native.numberOfChannels;
    }

    get sampleRate(): number {
        return this.native.sampleRate;
    }

    get length(): number {
        return this.native.length;
    }

    getChannelData(channel: number): Float32Array {
        return this.native.getChannelData(channel);
    }

    getNative(): AudioBuffer {
        return this.native;
    }
}
