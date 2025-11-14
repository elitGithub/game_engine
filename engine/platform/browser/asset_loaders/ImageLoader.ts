// engine/systems/asset_loaders/ImageLoader.ts
import type {AssetType, IAssetLoader} from '@engine/core/IAssetLoader';
import {IImageLoader} from "@engine/interfaces";

export class ImageLoader implements IAssetLoader {
    public readonly type: AssetType = 'image';

    constructor(private readonly imageLoader: IImageLoader) {
        if (!imageLoader) {
            throw new Error("[ImageLoader] A platform-specific loadImage implementation is required.");
        }
    }

    async load(url: string): Promise<HTMLImageElement> {
        // Delegate loading to the platform-provided function
        return this.imageLoader.loadImage(url);
    }
}