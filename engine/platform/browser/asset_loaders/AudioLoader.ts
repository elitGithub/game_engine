// engine/systems/asset_loaders/AudioLoader.ts
import type {AssetType, IAssetLoader} from '@engine/core/IAssetLoader';

export class AudioLoader implements IAssetLoader {
    public readonly type: AssetType = 'audio';

    constructor(private audioContext: AudioContext,
                private platformFetch: (url: string, options?: RequestInit) => Promise<Response>) {
        if (!audioContext) {
            throw new Error("[AudioLoader] AudioContext is required.");
        }
        if (!platformFetch) {
            throw new Error("[AudioLoader] A platform-specific fetch implementation is required.");
        }
    }

    async load(url: string): Promise<AudioBuffer> {
        try {
            const response = await this.platformFetch(url);
            if (!response.ok) {
                throw new Error(`[AudioLoader] HTTP error ${response.status} for ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return await this.audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`[AudioLoader] Failed to load '${url}':`, error);
            throw error;
        }
    }
}