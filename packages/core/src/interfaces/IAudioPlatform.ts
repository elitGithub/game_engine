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
     * @param offset - Offset into the buffer to start playback (in seconds)
     * @param duration - Duration to play (in seconds)
     */
    start(when?: number, offset?: number, duration?: number): void;

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

    /**
     * Register callback to be invoked when playback ends naturally
     * (not when stopped manually, only when buffer finishes playing)
     *
     * Critical for resource pooling - allows SfxPool and VoicePlayer to
     * reclaim audio chains when playback completes naturally.
     *
     * @param callback - Function to call when playback ends
     */
    onEnded(callback: () => void): void;
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
     * Connect to destination or another gain node
     */
    connect(destination: IAudioDestination | IAudioGain): void;

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
     * Get native audio context (for legacy code that needs direct access)
     *
     * Returns the platform-specific native context (e.g., Web Audio API AudioContext).
     * Use this only when you need direct access to native APIs.
     * Prefer getContext() for platform-agnostic code.
     */
    getNativeContext?(): AudioContext | null;

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
