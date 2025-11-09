/**
 * Audio Platform Abstraction
 *
 * Fully platform-agnostic audio interfaces.
 * NO coupling to Web Audio API or any platform-specific types.
 *
 * This abstraction allows audio to work on:
 * - Browser (Web Audio API)
 * - Native mobile (AVAudioEngine, Android Audio)
 * - Desktop (SDL Audio, OpenAL)
 * - Headless (mock)
 */

/**
 * Audio platform type
 */
export type AudioPlatformType = 'webaudio' | 'native' | 'mock' | 'custom';

/**
 * Audio context state
 */
export type AudioContextState = 'suspended' | 'running' | 'closed';

/**
 * Supported audio formats
 */
export type AudioFormat =
    | 'audio/mpeg'      // MP3
    | 'audio/ogg'       // OGG
    | 'audio/wav'       // WAV
    | 'audio/webm'      // WebM
    | 'audio/aac'       // AAC
    | 'audio/flac';     // FLAC

// ============================================================================
// CORE AUDIO INTERFACES
// ============================================================================

/**
 * IAudioContext - Platform-agnostic audio context
 *
 * Replaces Web Audio API's AudioContext with platform-independent interface.
 * Platform implementations wrap their native audio context.
 *
 * Example:
 * ```typescript
 * class WebAudioContext implements IAudioContext {
 *     constructor(private nativeContext: AudioContext) {}
 *
 *     async resume(): Promise<void> {
 *         await this.nativeContext.resume();
 *     }
 *     // ... other methods wrap native context
 * }
 * ```
 */
export interface IAudioContext {
    /**
     * Current state of the audio context
     */
    readonly state: AudioContextState;

    /**
     * Sample rate in Hz
     */
    readonly sampleRate: number;

    /**
     * Current time in seconds
     */
    readonly currentTime: number;

    /**
     * Resume audio context (required for autoplay policies)
     */
    resume(): Promise<void>;

    /**
     * Suspend audio context (pause all audio)
     */
    suspend(): Promise<void>;

    /**
     * Close audio context (cleanup, cannot be reopened)
     */
    close(): Promise<void>;

    /**
     * Create audio buffer from raw data
     */
    createBuffer(
        numberOfChannels: number,
        length: number,
        sampleRate: number
    ): IAudioBuffer;

    /**
     * Decode audio data from file
     */
    decodeAudioData(data: ArrayBuffer): Promise<IAudioBuffer>;

    /**
     * Create audio source from buffer
     */
    createSource(buffer: IAudioBuffer): IAudioSource;

    /**
     * Create gain node for volume control
     */
    createGain(): IAudioGain;

    /**
     * Get the master output (destination)
     */
    getDestination(): IAudioDestination;
}

/**
 * IAudioBuffer - Platform-agnostic audio buffer
 *
 * Represents decoded audio data ready for playback.
 */
export interface IAudioBuffer {
    /**
     * Duration in seconds
     */
    readonly duration: number;

    /**
     * Number of audio channels (1 = mono, 2 = stereo)
     */
    readonly numberOfChannels: number;

    /**
     * Sample rate in Hz
     */
    readonly sampleRate: number;

    /**
     * Length in sample frames
     */
    readonly length: number;

    /**
     * Get raw channel data (for advanced use)
     */
    getChannelData?(channel: number): Float32Array;
}

/**
 * IAudioSource - Platform-agnostic audio source
 *
 * Represents a playable audio source (buffer + playback controls).
 */
export interface IAudioSource {
    /**
     * Start playback
     * @param when - When to start (in context time), 0 = immediate
     */
    start(when?: number): void;

    /**
     * Stop playback
     * @param when - When to stop (in context time), 0 = immediate
     */
    stop(when?: number): void;

    /**
     * Set whether audio should loop
     */
    setLoop(loop: boolean): void;

    /**
     * Set loop start time in seconds
     */
    setLoopStart?(start: number): void;

    /**
     * Set loop end time in seconds
     */
    setLoopEnd?(end: number): void;

    /**
     * Set playback rate (1.0 = normal speed)
     */
    setPlaybackRate?(rate: number): void;

    /**
     * Connect to destination or gain node
     */
    connect(destination: IAudioDestination | IAudioGain): void;

    /**
     * Disconnect from all outputs
     */
    disconnect(): void;

    /**
     * Check if source is currently playing
     */
    isPlaying?(): boolean;
}

/**
 * IAudioGain - Platform-agnostic gain/volume control
 *
 * Controls volume for audio sources.
 */
export interface IAudioGain {
    /**
     * Get current gain value (0.0 to 1.0)
     */
    getValue(): number;

    /**
     * Set gain value immediately
     * @param value - Gain value (0.0 = silent, 1.0 = full volume)
     */
    setValue(value: number): void;

    /**
     * Fade gain to value over time
     * @param value - Target gain value
     * @param duration - Duration in seconds
     */
    fadeTo?(value: number, duration: number): void;

    /**
     * Connect to destination
     */
    connect(destination: IAudioDestination): void;

    /**
     * Disconnect from all outputs
     */
    disconnect(): void;
}

/**
 * IAudioDestination - Platform-agnostic audio output
 *
 * Represents the final audio output (speakers/headphones).
 */
export interface IAudioDestination {
    /**
     * Maximum number of channels supported
     */
    readonly maxChannelCount: number;
}

// ============================================================================
// AUDIO PLATFORM
// ============================================================================

/**
 * Audio capabilities
 */
export interface AudioCapabilities {
    /**
     * Maximum number of simultaneous audio sources
     */
    maxSources: number;

    /**
     * Supported audio formats
     */
    supportedFormats: AudioFormat[];

    /**
     * Supports spatial audio (3D sound)
     */
    spatialAudio: boolean;

    /**
     * Supports audio effects
     */
    effects: boolean;

    /**
     * Supports real-time audio processing
     */
    realtimeProcessing: boolean;

    /**
     * Additional platform-specific capabilities
     */
    custom?: Record<string, unknown>;
}

/**
 * IAudioPlatform - Platform audio adapter (SINGLETON)
 *
 * Provides platform-specific audio context.
 * Platform owns and manages the audio context lifecycle.
 *
 * Example:
 * ```typescript
 * const audioPlatform = platform.getAudioPlatform();
 * if (audioPlatform?.isSupported()) {
 *     const context = audioPlatform.getContext();
 *     await context.resume();  // Resume for autoplay policy
 *     const source = context.createSource(buffer);
 *     source.start();
 * }
 * ```
 */
export interface IAudioPlatform {
    /**
     * Platform type identifier
     */
    getType(): AudioPlatformType;

    /**
     * Check if audio is supported on this platform
     */
    isSupported(): boolean;

    /**
     * Get audio context (singleton)
     *
     * Returns the same context instance on multiple calls.
     * Returns null if audio is not supported.
     */
    getContext(): IAudioContext | null;

    /**
     * Get audio capabilities
     */
    getCapabilities(): AudioCapabilities;

    /**
     * Dispose audio platform (cleanup)
     */
    dispose(): void;
}

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

// ============================================================================
// MOCK AUDIO PLATFORM
// ============================================================================

/**
 * Mock Audio Platform - For testing and headless environments
 */
export class MockAudioPlatform implements IAudioPlatform {
    private context: MockAudioContext | null = null;

    getType(): AudioPlatformType {
        return 'mock';
    }

    isSupported(): boolean {
        return true; // Mock is always "supported"
    }

    getContext(): IAudioContext | null {
        if (!this.context) {
            this.context = new MockAudioContext();
        }
        return this.context;
    }

    getCapabilities(): AudioCapabilities {
        return {
            maxSources: 0,
            supportedFormats: [],
            spatialAudio: false,
            effects: false,
            realtimeProcessing: false
        };
    }

    dispose(): void {
        if (this.context) {
            this.context.close();
            this.context = null;
        }
    }
}

/**
 * Mock audio context - Does nothing, for testing
 */
class MockAudioContext implements IAudioContext {
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
            disconnect: () => {}
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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper to check format support
 */
export function supportsAudioFormat(
    platform: IAudioPlatform,
    format: AudioFormat
): boolean {
    return platform.getCapabilities().supportedFormats.includes(format);
}
