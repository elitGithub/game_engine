/**
 * WebAudioContext - Wraps native AudioContext
 */

import type {
    IAudioContext,
    IAudioBuffer,
    IAudioSource,
    IAudioGain,
    IAudioDestination,
    AudioContextState
} from '@game-engine/core/interfaces/IAudioPlatform';
import { WebAudioBuffer } from './WebAudioBuffer';
import { WebAudioSource } from './WebAudioSource';
import { WebAudioGain } from './WebAudioGain';
import { WebAudioDestination } from './WebAudioDestination';
import type { ILogger } from '@game-engine/core/interfaces';

export class WebAudioContext implements IAudioContext {
    constructor(
        private readonly native: AudioContext,
        private readonly logger: ILogger
    ) {}

    get state(): AudioContextState {
        return this.native.state as AudioContextState;
    }

    get sampleRate(): number {
        return this.native.sampleRate;
    }

    get currentTime(): number {
        return this.native.currentTime;
    }

    async resume(): Promise<void> {
        await this.native.resume();
    }

    async suspend(): Promise<void> {
        await this.native.suspend();
    }

    async close(): Promise<void> {
        await this.native.close();
    }

    getNative(): AudioContext {
        return this.native;
    }

    createBuffer(numberOfChannels: number, length: number, sampleRate: number): IAudioBuffer {
        const buffer = this.native.createBuffer(numberOfChannels, length, sampleRate);
        return new WebAudioBuffer(buffer);
    }

    async decodeAudioData(data: ArrayBuffer): Promise<IAudioBuffer> {
        const buffer = await this.native.decodeAudioData(data);
        return new WebAudioBuffer(buffer);
    }

    createSource(buffer: IAudioBuffer): IAudioSource {
        const source = this.native.createBufferSource();
        source.buffer = (buffer as WebAudioBuffer).getNative();
        return new WebAudioSource(source, this.logger);
    }

    createGain(): IAudioGain {
        const gain = this.native.createGain();
        return new WebAudioGain(gain);
    }

    getDestination(): IAudioDestination {
        return new WebAudioDestination(this.native.destination);
    }
}
