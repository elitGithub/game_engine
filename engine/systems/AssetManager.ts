// engine/systems/AssetManager.ts
import type { IAssetLoader, AssetType } from '@engine/core/IAssetLoader';
import type { EventBus } from '@engine/core/EventBus';

export interface AssetManifestEntry {
    id: string;
    url: string;
    type: AssetType;
}

export class AssetManager {
    private eventBus: EventBus;
    private loaders: Map<AssetType, IAssetLoader>;
    private cache: Map<string, any>;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this.loaders = new Map();
        this.cache = new Map();
    }

    /**
     * Register a loader for a specific asset type.
     */
    registerLoader(loader: IAssetLoader): void {
        if (this.loaders.has(loader.type)) {
            console.warn(`[AssetManager] Loader for type '${loader.type}' already registered. Overwriting.`);
        }
        this.loaders.set(loader.type, loader);
    }

    /**
     * Load a list of assets defined in a manifest.
     */
    async loadManifest(manifest: AssetManifestEntry[]): Promise<void> {
        const promises = manifest.map(entry => this.load(entry.id, entry.url, entry.type));

        try {
            await Promise.all(promises);
            this.eventBus.emit('assets.manifest.loaded', { count: manifest.length });
        } catch (error) {
            console.error('[AssetManager] Failed to load asset manifest:', error);
            this.eventBus.emit('assets.manifest.failed', { error });
        }
    }

    /**
     * Load a single asset and cache it by its ID.
     */
    async load(id: string, url: string, type: AssetType): Promise<any> {
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
            console.error(`[AssetManager] Failed to load asset '${id}' from '${url}':`, error);
            throw error;
        }
    }

    /**
     * Get a pre-loaded asset from the cache.
     */
    get<T = any>(id: string): T | null {
        if (!this.cache.has(id)) {
            console.warn(`[AssetManager] Asset '${id}' not found in cache.`);
            return null;
        }
        return this.cache.get(id) as T;
    }

    /**
     * Check if an asset is in the cache.
     */
    has(id: string): boolean {
        return this.cache.has(id);
    }

    /**
     * Clear all cached assets.
     */
    clearCache(): void {
        this.cache.clear();
        this.eventBus.emit('assets.cache.cleared', {});
    }

    /**
     * Remove a specific asset from the cache.
     */
    remove(id: string): boolean {
        return this.cache.delete(id);
    }
}