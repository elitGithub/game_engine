/**
 * Mock audio context - Does nothing, for testing
 */

import type {
    IAudioContext,
    IAudioBuffer,
    IAudioSource,
    IAudioGain,
    IAudioDestination,
    AudioContextState
} from '@engine/interfaces/IAudioPlatform';

export class MockAudioContext implements IAudioContext {
    public state: AudioContextState = 'suspended';
    public readonly sampleRate = 44100;
    public currentTime = 0;

    async resume(): Promise<void> {
        this.state = 'running';
    }

    async suspend(): Promise<void> {
        this.state = 'suspended';
    }

    async close(): Promise<void> {
        this.state = 'closed';
    }

    createBuffer(): IAudioBuffer {
        return { duration: 0, numberOfChannels: 0, sampleRate: 0, length: 0 };
    }

    async decodeAudioData(): Promise<IAudioBuffer> {
        return { duration: 0, numberOfChannels: 0, sampleRate: 0, length: 0 };
    }

    createSource(): IAudioSource {
        return {
            start: () => {},
            stop: () => {},
            setLoop: () => {},
            connect: () => {},
            disconnect: () => {},
            onEnded: () => {}
        };
    }

    createGain(): IAudioGain {
        return {
            getValue: () => 1.0,
            setValue: () => {},
            connect: () => {},
            disconnect: () => {}
        };
    }

    getDestination(): IAudioDestination {
        return { maxChannelCount: 2 };
    }
}
