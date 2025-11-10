// engine/systems/asset_loaders/ImageLoader.ts
import type {AssetType, IAssetLoader} from '@engine/core/IAssetLoader';

export class ImageLoader implements IAssetLoader {
    public readonly type: AssetType = 'image';

    constructor(
        private platformLoadImage: (src: string) => Promise<HTMLImageElement>
    ) {
        if (!platformLoadImage) {
            throw new Error("[ImageLoader] A platform-specific loadImage implementation is required.");
        }
    }

    async load(url: string): Promise<HTMLImageElement> {
        // Delegate loading to the platform-provided function
        return this.platformLoadImage(url);
    }
}