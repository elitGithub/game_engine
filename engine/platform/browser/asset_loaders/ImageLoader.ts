// engine/systems/asset_loaders/ImageLoader.ts
import type { IAssetLoader, AssetType } from '@engine/core/IAssetLoader';

export class ImageLoader implements IAssetLoader {
    public readonly type: AssetType = 'image';

    async load(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`[ImageLoader] Failed to load: ${url}`));
            img.src = url;
        });
    }
}