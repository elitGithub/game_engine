// engine/systems/AssetManager.ts
import type { IAssetLoader, AssetType } from '@engine/core/IAssetLoader';
import type { EventBus } from '@engine/core/EventBus';
import {ILogger} from "@engine/interfaces";

export interface AssetManifestEntry {
    id: string;
    url: string;
    type: AssetType;
}

export class AssetManager {
    private loaders: Map<AssetType, IAssetLoader>;
    private cache: Map<string, unknown>;

    constructor(private eventBus: EventBus, private logger: ILogger) {
        this.loaders = new Map();
        this.cache = new Map();
    }

    /**
     * Register a loader for a specific asset type.
     * If a loader for this type already exists, it will be overwritten.
     *
     * @param loader - The asset loader to register
     */
    registerLoader(loader: IAssetLoader): void {
        if (this.loaders.has(loader.type)) {
            this.logger.warn(`[AssetManager] Loader for type '${loader.type}' already registered. Overwriting.`);
        }
        this.loaders.set(loader.type, loader);
    }

    /**
     * Load a list of assets defined in a manifest.
     * Emits 'assets.manifest.loaded' on success or 'assets.manifest.failed' on error.
     *
     * @param manifest - Array of asset entries to load
     * @throws Error if any asset fails to load
     */
    async loadManifest(manifest: AssetManifestEntry[]): Promise<void> {
        const promises = manifest.map(entry => this.load(entry.id, entry.url, entry.type));

        try {
            await Promise.all(promises);
            this.eventBus.emit('assets.manifest.loaded', { count: manifest.length });
        } catch (error) {
            this.logger.error('[AssetManager] Failed to load asset manifest:', error);
            this.eventBus.emit('assets.manifest.failed', { error });
        }
    }

    /**
     * Load a single asset and cache it by its ID.
     * If the asset is already cached, returns the cached version.
     * Emits 'assets.loaded' event on successful load.
     *
     * @param id - Unique identifier for the asset to be used for caching
     * @param url - URL or path to the asset file
     * @param type - Type of asset to load (determines which loader to use)
     * @returns Promise that resolves to the loaded asset
     * @throws Error if no loader is registered for the asset type
     * @throws Error if the loader fails to load the asset
     */
    async load(id: string, url: string, type: AssetType): Promise<unknown> {
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const loader = this.loaders.get(type);
        if (!loader) {
            throw new Error(`[AssetManager] No loader registered for type: ${type}`);
        }

        try {
            const asset = await loader.load(url);
            this.cache.set(id, asset);
            this.eventBus.emit('assets.loaded', { id, type, asset });
            return asset;
        } catch (error) {
            this.logger.error(`[AssetManager] Failed to load asset '${id}' from '${url}':`, error);
            throw error;
        }
    }

    /**
     * Get a pre-loaded asset from the cache.
     * Returns null if the asset is not found. Caller must specify the expected
     * type parameter to ensure type safety.
     *
     * @param id - Unique identifier of the asset to retrieve
     * @returns The cached asset cast to type T, or null if not found
     * @example
     * ```typescript
     * const texture = assetManager.get<HTMLImageElement>('player-sprite');
     * if (texture) {
     *   // use texture
     * }
     * ```
     */
    get<T>(id: string): T | null {
        if (!this.cache.has(id)) {
            this.logger.warn(`[AssetManager] Asset '${id}' not found in cache.`);
            return null;
        }
        return this.cache.get(id) as T;
    }

    /**
     * Check if an asset is in the cache.
     *
     * @param id - Unique identifier of the asset to check
     * @returns True if the asset exists in cache, false otherwise
     */
    has(id: string): boolean {
        return this.cache.has(id);
    }

    /**
     * Clear all cached assets.
     * Emits 'assets.cache.cleared' event when complete.
     * Use this to free memory or force reload of all assets.
     */
    clearCache(): void {
        this.cache.clear();
        this.eventBus.emit('assets.cache.cleared', {});
    }

    /**
     * Remove a specific asset from the cache.
     * Use this to free memory for individual assets that are no longer needed.
     *
     * @param id - Unique identifier of the asset to remove
     * @returns True if the asset was found and removed, false if it was not in cache
     */
    remove(id: string): boolean {
        return this.cache.delete(id);
    }
}