// engine/core/IAssetLoader.ts
export type AssetType = 'image' | 'audio' | 'json' | 'text' | 'binary';

export interface IAssetLoader {
    /**
     * The asset type this loader handles (e.g., 'image', 'audio')
     */
    readonly type: AssetType;

    /**
     * Load an asset from a given URL.
     * @param url - The URL (or path) to the asset.
     * @returns A promise that resolves to the loaded asset.
     */
    load(url: string): Promise<unknown>;
}