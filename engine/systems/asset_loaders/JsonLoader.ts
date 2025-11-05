// engine/systems/asset_loaders/JsonLoader.ts
import type { IAssetLoader, AssetType } from '@engine/core/IAssetLoader';

export class JsonLoader implements IAssetLoader {
    public readonly type: AssetType = 'json';

    async load(url: string): Promise<Record<string, any>> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`[JsonLoader] HTTP error ${response.status} for ${url}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[JsonLoader] Failed to load '${url}':`, error);
            throw error;
        }
    }
}