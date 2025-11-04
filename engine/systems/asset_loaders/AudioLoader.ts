// engine/systems/asset_loaders/AudioLoader.ts
import type {AssetType, IAssetLoader} from '@engine/core/IAssetLoader';

export class AudioLoader implements IAssetLoader {
    public readonly type: AssetType = 'audio';
    private audioContext: AudioContext;

    constructor(audioContext: AudioContext) {
        if (!audioContext) {
            throw new Error("[AudioLoader] AudioContext is required.");
        }
        this.audioContext = audioContext;
    }

    async load(url: string): Promise<AudioBuffer> {
        try {
            const response = await fetch(url);
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