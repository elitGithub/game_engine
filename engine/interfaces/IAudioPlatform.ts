/**
 * Audio Platform Abstraction
 *
 * Platform-agnostic audio context and capabilities.
 * Replaces hardcoded window.AudioContext dependency.
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
 * IAudioPlatform - Platform-agnostic audio interface
 *
 * Abstracts away platform-specific audio APIs:
 * - Browser: Web Audio API (window.AudioContext)
 * - Native: Platform-specific audio (AVAudioEngine, Android Audio, etc.)
 * - Node.js: Mock or headless audio
 * - Testing: Mock audio
 *
 * Example:
 * ```typescript
 * class WebAudioPlatform implements IAudioPlatform {
 *     createContext(): AudioContext | null {
 *         try {
 *             return new (window.AudioContext || window.webkitAudioContext)();
 *         } catch {
 *             return null;
 *         }
 *     }
 * }
 *
 * // In engine
 * const audioPlatform = platform.getAudioPlatform();
 * if (audioPlatform?.isSupported()) {
 *     const ctx = audioPlatform.createContext();
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
     * Create audio context
     *
     * Returns null if audio is not supported or creation fails
     */
    createContext(): AudioContext | null;

    /**
     * Get context state
     */
    getContextState?(context: AudioContext): AudioContextState;

    /**
     * Resume audio context (required for autoplay policies)
     */
    resumeContext?(context: AudioContext): Promise<void>;

    /**
     * Suspend audio context (pause audio)
     */
    suspendContext?(context: AudioContext): Promise<void>;

    /**
     * Close audio context (cleanup)
     */
    closeContext?(context: AudioContext): Promise<void>;

    /**
     * Get audio capabilities
     */
    getCapabilities(): AudioCapabilities;
}

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
     * Additional platform-specific capabilities
     */
    custom?: Record<string, unknown>;
}

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

/**
 * Web Audio Platform - Browser implementation
 */
export class WebAudioPlatform implements IAudioPlatform {
    private context: AudioContext | null = null;

    getType(): AudioPlatformType {
        return 'webaudio';
    }

    isSupported(): boolean {
        return typeof window !== 'undefined' &&
               (typeof window.AudioContext !== 'undefined' ||
                typeof (window as any).webkitAudioContext !== 'undefined');
    }

    createContext(): AudioContext | null {
        if (!this.isSupported()) {
            return null;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
            return this.context;
        } catch (error) {
            console.error('[WebAudioPlatform] Failed to create AudioContext:', error);
            return null;
        }
    }

    getContextState(context: AudioContext): AudioContextState {
        return context.state as AudioContextState;
    }

    async resumeContext(context: AudioContext): Promise<void> {
        if (context.state === 'suspended') {
            await context.resume();
        }
    }

    async suspendContext(context: AudioContext): Promise<void> {
        if (context.state === 'running') {
            await context.suspend();
        }
    }

    async closeContext(context: AudioContext): Promise<void> {
        await context.close();
    }

    getCapabilities(): AudioCapabilities {
        return {
            maxSources: 32, // Typical Web Audio limit
            supportedFormats: this.detectSupportedFormats(),
            spatialAudio: true,
            effects: true
        };
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
 * Mock Audio Platform - For testing and headless environments
 */
export class MockAudioPlatform implements IAudioPlatform {
    getType(): AudioPlatformType {
        return 'mock';
    }

    isSupported(): boolean {
        return true; // Mock is always "supported"
    }

    createContext(): AudioContext | null {
        // Return a mock AudioContext
        // For true mocking, you'd implement a full mock here
        return null;
    }

    getCapabilities(): AudioCapabilities {
        return {
            maxSources: 0,
            supportedFormats: [],
            spatialAudio: false,
            effects: false
        };
    }
}

/**
 * Helper to check format support
 */
export function supportsAudioFormat(
    platform: IAudioPlatform,
    format: AudioFormat
): boolean {
    return platform.getCapabilities().supportedFormats.includes(format);
}
