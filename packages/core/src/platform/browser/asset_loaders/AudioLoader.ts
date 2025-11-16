// engine/systems/asset_loaders/AudioLoader.ts
import type {AssetType, IAssetLoader} from '@game-engine/core/core/IAssetLoader';
import type {ILogger, INetworkProvider} from "@game-engine/core/interfaces";
import type {IAudioBuffer, IAudioContext} from "@game-engine/core/interfaces/IAudioPlatform";


export class AudioLoader implements IAssetLoader {
    public readonly type: AssetType = 'audio';

    constructor(private readonly audioContext: IAudioContext,
                private readonly networkProvider: INetworkProvider,
                private readonly logger: ILogger) {
        if (!audioContext) {
            throw new Error("[AudioLoader] AudioContext is required.");
        }
        if (!networkProvider) {
            throw new Error("[AudioLoader] A platform-specific fetch implementation is required.");
        }
    }

    load(url: string): Promise<IAudioBuffer> {
        return this.networkProvider.fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`[AudioLoader] HTTP error ${response.status} for ${url}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => {
                return this.audioContext.decodeAudioData(arrayBuffer);
            })
            .catch(error => {
                this.logger.error(`[AudioLoader] Failed to load '${url}':`, error);
                throw error;
            });
    }
}