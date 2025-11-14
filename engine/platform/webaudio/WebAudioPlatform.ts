/**
 * Web Audio Platform Implementation
 *
 * Platform-specific implementation of IAudioPlatform for web browsers.
 * Wraps the Web Audio API into platform-agnostic interfaces.
 */

import type {
    IAudioPlatform,
    IAudioContext,
    AudioPlatformType,
    AudioCapabilities,
    AudioFormat
} from '@engine/interfaces/IAudioPlatform';
import { WebAudioContext } from '@engine/platform/webaudio/WebAudioContext';
import type {ILogger} from "@engine/interfaces";

/**
 * Extended Window interface for webkit vendor prefix support
 */
interface WindowWithWebkit extends Window {
    webkitAudioContext?: typeof AudioContext;
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

    constructor(private readonly logger: ILogger) {
    }
    
    getType(): AudioPlatformType {
        return 'webaudio';
    }

    isSupported(): boolean {
        return typeof window !== 'undefined' &&
               (typeof window.AudioContext !== 'undefined' ||
                typeof (window as WindowWithWebkit).webkitAudioContext !== 'undefined');
    }

    getContext(): IAudioContext | null {
        if (!this.isSupported()) {
            return null;
        }

        // Singleton: create once, return same instance
        if (!this.context) {
            try {
                const AudioContextClass = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
                const nativeContext = new AudioContextClass();
                this.context = new WebAudioContext(nativeContext);
            } catch (error) {
                this.logger.error('[WebAudioPlatform] Failed to create AudioContext:', error);
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
