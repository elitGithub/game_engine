// engine/systems/asset_loaders/JsonLoader.ts
import type {AssetType, IAssetLoader} from '@engine/core/IAssetLoader';
import {ILogger, INetworkProvider} from "@engine/interfaces";

export class JsonLoader implements IAssetLoader {
    public readonly type: AssetType = 'json';

    constructor(private readonly networkProvider: INetworkProvider, private readonly logger: ILogger) {
        if (!networkProvider) {
            throw new Error("[JsonLoader] A platform-specific fetch implementation is required.");
        }
    }

    load(url: string): Promise<Record<string, any>> {
        return this.networkProvider.fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`[JsonLoader] HTTP error ${response.status} for ${url}`);
                }
                return response.json();
            })
            .catch(error => {
                this.logger.error(`[JsonLoader] Failed to load '${url}':`, error);
                throw error;
            });
    }
}