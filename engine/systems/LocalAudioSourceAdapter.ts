/**
 * LocalAudioSourceAdapter - Default adapter for loading audio from local files
 */
import type { AudioSourceAdapter, AudioAssetMap } from './AudioSourceAdapter';

export class LocalAudioSourceAdapter implements AudioSourceAdapter {
    private audioContext: AudioContext;
    private assetMap: AudioAssetMap;
    private cache: Map<string, AudioBuffer>;

    constructor(audioContext: AudioContext, assetMap: AudioAssetMap) {
        this.audioContext = audioContext;
        this.assetMap = assetMap;
        this.cache = new Map();
    }

    async load(audioId: string): Promise<AudioBuffer> {
        // Check cache first
        if (this.cache.has(audioId)) {
            return this.cache.get(audioId)!;
        }

        const url = this.getUrl(audioId);
        if (!url) {
            throw new Error(`Audio asset '${audioId}' not found in asset map`);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Cache it
            this.cache.set(audioId, audioBuffer);

            return audioBuffer;
        } catch (error) {
            console.error(`[LocalAudioSource] Failed to load '${audioId}' from '${url}':`, error);
            throw error;
        }
    }

    getUrl(audioId: string): string {
        return this.assetMap[audioId] || '';
    }

    updateAssetMap(newAssets: AudioAssetMap): void {
        this.assetMap = { ...this.assetMap, ...newAssets };
    }

    clearCache(): void {
        this.cache.clear();
    }
}