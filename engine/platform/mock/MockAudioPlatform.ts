/**
 * Mock Audio Platform Implementation
 *
 * Platform-agnostic mock implementation for testing and headless environments.
 * Provides no-op implementations of all audio interfaces.
 */

import type {
    IAudioPlatform,
    IAudioContext,
    AudioPlatformType,
    AudioCapabilities
} from '@engine/interfaces/IAudioPlatform';
import { MockAudioContext } from './MockAudioContext';

// ============================================================================
// MOCK AUDIO PLATFORM
// ============================================================================

/**
 * Mock Audio Platform - For testing and headless environments
 */
export class MockAudioPlatform implements IAudioPlatform {
    private context: MockAudioContext | null = null;
    private nativeContext: unknown = null;

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

    getNativeContext(): AudioContext | null {
        // Return a mock native context for testing
        if (!this.nativeContext) {
            this.nativeContext = {
                state: 'suspended',
                sampleRate: 44100,
                currentTime: 0,
                resume: () => Promise.resolve(),
                suspend: () => Promise.resolve(),
                close: () => Promise.resolve(),
                createBuffer: () => ({ duration: 0, numberOfChannels: 0, sampleRate: 0, length: 0 }),
                decodeAudioData: () => Promise.resolve({ duration: 0, numberOfChannels: 0, sampleRate: 0, length: 0 }),
                createBufferSource: () => ({
                    buffer: null,
                    loop: false,
                    start: () => {},
                    stop: () => {},
                    connect: () => {},
                    disconnect: () => {}
                }),
                createGain: () => ({
                    gain: { value: 1.0 },
                    connect: () => {},
                    disconnect: () => {}
                }),
                destination: { maxChannelCount: 2 }
            } as any;
        }
        return this.nativeContext as AudioContext;
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
