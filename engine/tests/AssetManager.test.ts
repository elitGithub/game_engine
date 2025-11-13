// engine/tests/AssetManager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetManager, type AssetManifestEntry } from '@engine/systems/AssetManager';
import { EventBus } from '@engine/core/EventBus';
import type { IAssetLoader } from '@engine/core/IAssetLoader';
import type {ILogger} from "@engine/interfaces";

// Mock dependencies
vi.mock('@engine/core/EventBus');

// Mock a simple loader
const mockImageLoader: IAssetLoader = {
    type: 'image',
    load: vi.fn(async (url) => `loaded:${url}`),
};

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

const mockAudioLoader: IAssetLoader = {
    type: 'audio',
    load: vi.fn(async (url) => `loaded:${url}`),
};

describe('AssetManager', () => {
    let assetManager: AssetManager;
    let mockEventBus: EventBus;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEventBus = new EventBus(mockLogger);
        vi.spyOn(mockEventBus, 'emit');

        assetManager = new AssetManager(mockEventBus, mockLogger);
        assetManager.registerLoader(mockImageLoader);
        assetManager.registerLoader(mockAudioLoader);
    });

    it('should register a loader', () => {
        expect(() => assetManager.registerLoader(mockImageLoader)).not.toThrow();
    });

    it('should load a single asset', async () => {
        const asset = await assetManager.load('img1', '/img/foo.png', 'image');

        expect(asset).toBe('loaded:/img/foo.png');
        expect(mockImageLoader.load).toHaveBeenCalledWith('/img/foo.png');
        expect(assetManager.has('img1')).toBe(true);
        expect(assetManager.get('img1')).toBe(asset);
        expect(mockEventBus.emit).toHaveBeenCalledWith('assets.loaded', {
            id: 'img1',
            type: 'image',
            asset: asset,
        });
    });

    it('should throw if no loader is registered for type', async () => {
        await expect(assetManager.load('data', '/data.json', 'json'))
            .rejects
            .toThrow('No loader registered for type: json');
    });

    it('should return cached asset without loading again', async () => {
        await assetManager.load('img1', '/img/foo.png', 'image');
        expect(mockImageLoader.load).toHaveBeenCalledTimes(1);

        // Load again
        const asset = await assetManager.load('img1', '/img/foo.png', 'image');
        expect(asset).toBe('loaded:/img/foo.png');
        // Should not have called the loader again
        expect(mockImageLoader.load).toHaveBeenCalledTimes(1);
    });

    it('should load a manifest of assets', async () => {
        const manifest: AssetManifestEntry[] = [
            { id: 'img1', url: '/img/foo.png', type: 'image' },
            { id: 'sfx1', url: '/snd/bar.mp3', type: 'audio' },
        ];

        await assetManager.loadManifest(manifest);

        expect(mockImageLoader.load).toHaveBeenCalledWith('/img/foo.png');
        expect(mockAudioLoader.load).toHaveBeenCalledWith('/snd/bar.mp3');
        expect(assetManager.get('img1')).toBe('loaded:/img/foo.png');
        expect(assetManager.get('sfx1')).toBe('loaded:/snd/bar.mp3');
        expect(mockEventBus.emit).toHaveBeenCalledWith('assets.manifest.loaded', { count: 2 });
    });

    it('should emit manifest.failed on loader error', async () => {
        vi.mocked(mockAudioLoader.load).mockRejectedValue(new Error('Failed to load audio'));

        const manifest: AssetManifestEntry[] = [
            { id: 'img1', url: '/img/foo.png', type: 'image' },
            { id: 'sfx1', url: '/snd/bar.mp3', type: 'audio' }, // This one will fail
        ];

        await assetManager.loadManifest(manifest);

        expect(assetManager.has('img1')).toBe(true); // img1 still loaded
        expect(assetManager.has('sfx1')).toBe(false); // sfx1 failed
        expect(mockEventBus.emit).toHaveBeenCalledWith('assets.manifest.failed', {
            error: expect.any(Error)
        });
    });

    it('should clear the cache', async () => {
        await assetManager.load('img1', '/img/foo.png', 'image');
        expect(assetManager.has('img1')).toBe(true);

        assetManager.clearCache();
        expect(assetManager.has('img1')).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('assets.cache.cleared', {});
    });

    it('should remove a single asset from cache', async () => {
        await assetManager.load('img1', '/img/foo.png', 'image');
        expect(assetManager.has('img1')).toBe(true);

        const success = assetManager.remove('img1');
        expect(success).toBe(true);
        expect(assetManager.has('img1')).toBe(false);
    });

    it('should prevent race condition - concurrent loads of same asset', async () => {
        // Create a loader with a delay to simulate network request
        const delayedLoader: IAssetLoader = {
            type: 'image',
            load: vi.fn(async (url) => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return `loaded:${url}`;
            }),
        };

        assetManager.registerLoader(delayedLoader);

        // Start two concurrent loads WITHOUT await
        const promise1 = assetManager.load('hero', '/img/hero.png', 'image');
        const promise2 = assetManager.load('hero', '/img/hero.png', 'image');

        // Both should resolve to the same result
        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1).toBe('loaded:/img/hero.png');
        expect(result2).toBe('loaded:/img/hero.png');

        // Loader should only be called ONCE (no duplicate network request)
        expect(delayedLoader.load).toHaveBeenCalledTimes(1);
        expect(delayedLoader.load).toHaveBeenCalledWith('/img/hero.png');
    });

    it('should handle concurrent loads of different assets', async () => {
        // Create a loader with a delay
        const delayedLoader: IAssetLoader = {
            type: 'image',
            load: vi.fn(async (url) => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return `loaded:${url}`;
            }),
        };

        assetManager.registerLoader(delayedLoader);

        // Start concurrent loads of different assets
        const promise1 = assetManager.load('hero', '/img/hero.png', 'image');
        const promise2 = assetManager.load('enemy', '/img/enemy.png', 'image');

        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1).toBe('loaded:/img/hero.png');
        expect(result2).toBe('loaded:/img/enemy.png');

        // Loader should be called TWICE (one for each asset)
        expect(delayedLoader.load).toHaveBeenCalledTimes(2);
    });

    it('should clean up loading promises on error', async () => {
        const failingLoader: IAssetLoader = {
            type: 'image',
            load: vi.fn(async () => {
                throw new Error('Network error');
            }),
        };

        assetManager.registerLoader(failingLoader);

        // First load attempt fails
        await expect(assetManager.load('broken', '/img/broken.png', 'image')).rejects.toThrow('Network error');

        // Reset the mock to succeed
        vi.mocked(failingLoader.load).mockResolvedValue('loaded:/img/broken.png');

        // Second load attempt should try again (promise was cleaned up after error)
        const result = await assetManager.load('broken', '/img/broken.png', 'image');
        expect(result).toBe('loaded:/img/broken.png');
        expect(failingLoader.load).toHaveBeenCalledTimes(2); // Once failed, once succeeded
    });
});