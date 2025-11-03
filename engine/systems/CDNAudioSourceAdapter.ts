/**
 * CDNAudioSourceAdapter - Example adapter for loading audio from CDN
 */
import type { AudioSourceAdapter } from '../core/AudioSourceAdapter';

export interface CDNConfig {
    baseUrl: string;
    format?: string; // e.g., 'mp3', 'ogg'
    cacheBusting?: boolean;
}

export class CDNAudioSourceAdapter implements AudioSourceAdapter {
    private audioContext: AudioContext;
    private config: CDNConfig;
    private cache: Map<string, AudioBuffer>;

    constructor(audioContext: AudioContext, config: CDNConfig) {
        this.audioContext = audioContext;
        this.config = {
            format: 'mp3',
            cacheBusting: false,
            ...config
        };
        this.cache = new Map();
    }

    async load(audioId: string): Promise<AudioBuffer> {
        // Check cache
        if (this.cache.has(audioId)) {
            return this.cache.get(audioId)!;
        }

        const url = this.getUrl(audioId);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.cache.set(audioId, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`[CDNAudioSource] Failed to load '${audioId}':`, error);
            throw error;
        }
    }

    getUrl(audioId: string): string {
        let url = `${this.config.baseUrl}/${audioId}`;

        // Add extension if not present
        if (!audioId.includes('.')) {
            url += `.${this.config.format}`;
        }

        // Add cache busting
        if (this.config.cacheBusting) {
            url += `?v=${Date.now()}`;
        }

        return url;
    }

    clearCache(): void {
        this.cache.clear();
    }
}