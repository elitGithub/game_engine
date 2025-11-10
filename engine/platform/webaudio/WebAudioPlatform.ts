/**
 * Web Audio Platform Implementation
 *
 * Platform-specific implementation of IAudioPlatform for web browsers.
 * Wraps the Web Audio API into platform-agnostic interfaces.
 */

import type {
    IAudioPlatform,
    IAudioContext,
    IAudioBuffer,
    IAudioSource,
    IAudioGain,
    IAudioDestination,
    AudioPlatformType,
    AudioCapabilities,
    AudioFormat,
    AudioContextState
} from '@engine/interfaces/IAudioPlatform';

// ============================================================================
// WEB AUDIO PLATFORM IMPLEMENTATION
// ============================================================================

/**
 * Web Audio Platform - Browser implementation
 *
 * Wraps Web Audio API into platform-agnostic interfaces.
 */
export class WebAudioPlatform implements IAudioPlatform {
    private context: WebAudioContext | null = null;

    getType(): AudioPlatformType {
        return 'webaudio';
    }

    isSupported(): boolean {
        return typeof window !== 'undefined' &&
               (typeof window.AudioContext !== 'undefined' ||
                typeof (window as any).webkitAudioContext !== 'undefined');
    }

    getContext(): IAudioContext | null {
        if (!this.isSupported()) {
            return null;
        }

        // Singleton: create once, return same instance
        if (!this.context) {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const nativeContext = new AudioContextClass();
                this.context = new WebAudioContext(nativeContext);
            } catch (error) {
                console.error('[WebAudioPlatform] Failed to create AudioContext:', error);
                return null;
            }
        }

        return this.context;
    }

    getNativeContext(): AudioContext | null {
        const context = this.getContext();
        if (!context) return null;
        return (context as WebAudioContext).getNative();
    }

    getCapabilities(): AudioCapabilities {
        return {
            maxSources: 32, // Typical Web Audio limit
            supportedFormats: this.detectSupportedFormats(),
            spatialAudio: true,
            effects: true,
            realtimeProcessing: true
        };
    }

    dispose(): void {
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }

    private detectSupportedFormats(): AudioFormat[] {
        const audio = typeof Audio !== 'undefined' ? new Audio() : null;
        if (!audio) return [];

        const formats: AudioFormat[] = [];

        if (audio.canPlayType('audio/mpeg')) formats.push('audio/mpeg');
        if (audio.canPlayType('audio/ogg')) formats.push('audio/ogg');
        if (audio.canPlayType('audio/wav')) formats.push('audio/wav');
        if (audio.canPlayType('audio/webm')) formats.push('audio/webm');
        if (audio.canPlayType('audio/aac')) formats.push('audio/aac');

        return formats;
    }
}

// ============================================================================
// WEB AUDIO CONTEXT WRAPPERS
// ============================================================================

/**
 * WebAudioContext - Wraps native AudioContext
 */
class WebAudioContext implements IAudioContext {
    constructor(private native: AudioContext) {}

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
        return new WebAudioSource(source);
    }

    createGain(): IAudioGain {
        const gain = this.native.createGain();
        return new WebAudioGain(gain);
    }

    getDestination(): IAudioDestination {
        return new WebAudioDestination(this.native.destination);
    }
}

/**
 * WebAudioBuffer - Wraps native AudioBuffer
 */
class WebAudioBuffer implements IAudioBuffer {
    constructor(private native: AudioBuffer) {}

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

/**
 * WebAudioSource - Wraps native AudioBufferSourceNode
 */
class WebAudioSource implements IAudioSource {
    private playing = false;

    constructor(private native: AudioBufferSourceNode) {
        this.native.onended = () => {
            this.playing = false;
        };
    }

    start(when: number = 0): void {
        this.native.start(when);
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
}

/**
 * WebAudioGain - Wraps native GainNode
 */
class WebAudioGain implements IAudioGain {
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

/**
 * WebAudioDestination - Wraps native AudioDestinationNode
 */
class WebAudioDestination implements IAudioDestination {
    constructor(private native: AudioDestinationNode) {}

    get maxChannelCount(): number {
        return this.native.maxChannelCount;
    }

    getNative(): AudioDestinationNode {
        return this.native;
    }
}
