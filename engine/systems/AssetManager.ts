// engine/systems/AssetManager.ts
import type { IAssetLoader, AssetType } from '@engine/core/IAssetLoader';
import type { EventBus } from '@engine/core/EventBus';
import type {ILogger} from "@engine/interfaces";

export interface AssetManifestEntry {
    id: string;
    url: string;
    type: AssetType;
}

export interface AssetManagerOptions {
    /**
     * Maximum number of assets to keep in cache. When exceeded, least recently used assets are evicted.
     * Set to 0 or undefined for unlimited cache (default).
     */
    maxCacheSize?: number;
}

export class AssetManager {
    private loaders: Map<AssetType, IAssetLoader>;
    private cache: Map<string, unknown>;
    private loadingPromises: Map<string, Promise<unknown>>;

    // LRU tracking
    private accessOrder: string[]; // Most recently used at the end
    private maxCacheSize: number;

    constructor(private eventBus: EventBus, private logger: ILogger, options: AssetManagerOptions = {}) {
        this.loaders = new Map();
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.accessOrder = [];
        this.maxCacheSize = options.maxCacheSize || 0; // 0 = unlimited
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
     * If the asset is currently loading, returns the in-flight promise (prevents duplicate loads).
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
        // Return cached result if already loaded
        if (this.cache.has(id)) {
            this.updateAccessOrder(id); // Mark as recently used
            return this.cache.get(id);
        }

        // Return in-flight promise if already loading (prevents race condition)
        if (this.loadingPromises.has(id)) {
            return this.loadingPromises.get(id)!;
        }

        const loader = this.loaders.get(type);
        if (!loader) {
            throw new Error(`[AssetManager] No loader registered for type: ${type}`);
        }

        // Create and cache the loading promise
        const loadPromise = (async () => {
            try {
                const asset = await loader.load(url);
                this.addToCache(id, asset); // Use LRU-aware method
                this.loadingPromises.delete(id); // Clean up
                this.eventBus.emit('assets.loaded', { id, type, asset });
                return asset;
            } catch (error) {
                this.loadingPromises.delete(id); // Clean up on error too
                this.logger.error(`[AssetManager] Failed to load asset '${id}' from '${url}':`, error);
                throw error;
            }
        })();

        this.loadingPromises.set(id, loadPromise);
        return loadPromise;
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
        this.updateAccessOrder(id); // Mark as recently used
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
     * Clear all cached assets and in-flight loading promises.
     * Emits 'assets.cache.cleared' event when complete.
     * Use this to free memory or force reload of all assets.
     */
    clearCache(): void {
        this.cache.clear();
        this.loadingPromises.clear();
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
        const deleted = this.cache.delete(id);
        if (deleted) {
            // Remove from access order tracking
            const index = this.accessOrder.indexOf(id);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        }
        return deleted;
    }

    /**
     * Get cache statistics for monitoring and debugging.
     *
     * @returns Object with cache size, limit, and usage percentage
     */
    getCacheStats(): { size: number; limit: number; usagePercent: number } {
        const size = this.cache.size;
        const limit = this.maxCacheSize || Infinity;
        const usagePercent = this.maxCacheSize ? (size / this.maxCacheSize) * 100 : 0;
        return { size, limit, usagePercent };
    }

    // --- PRIVATE LRU HELPERS ---

    /**
     * Add asset to cache with LRU eviction if needed.
     */
    private addToCache(id: string, asset: unknown): void {
        // If cache is at limit, evict least recently used
        if (this.maxCacheSize > 0 && this.cache.size >= this.maxCacheSize && !this.cache.has(id)) {
            this.evictLRU();
        }

        this.cache.set(id, asset);
        this.updateAccessOrder(id);
    }

    /**
     * Update access order for LRU tracking.
     * Moves the asset to the end (most recently used).
     */
    private updateAccessOrder(id: string): void {
        // Remove from current position
        const index = this.accessOrder.indexOf(id);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        // Add to end (most recently used)
        this.accessOrder.push(id);
    }

    /**
     * Evict the least recently used asset from the cache.
     */
    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        const lruId = this.accessOrder[0]; // First item is least recently used
        this.cache.delete(lruId);
        this.accessOrder.shift();

        this.logger.log(`[AssetManager] Evicted LRU asset: ${lruId}`);
        this.eventBus.emit('assets.evicted', { id: lruId });
    }
}