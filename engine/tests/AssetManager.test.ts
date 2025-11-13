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

    describe('Type Validation', () => {
        beforeEach(() => {
            // Ensure loaders return success for type validation tests
            vi.mocked(mockImageLoader.load).mockResolvedValue('loaded:mock');
            vi.mocked(mockAudioLoader.load).mockResolvedValue('loaded:mock');
        });

        it('should store and retrieve asset type metadata', async () => {
            await assetManager.load('img1', '/img/foo.png', 'image');
            await assetManager.load('sfx1', '/snd/bar.mp3', 'audio');

            expect(assetManager.getType('img1')).toBe('image');
            expect(assetManager.getType('sfx1')).toBe('audio');
            expect(assetManager.getType('nonexistent')).toBeNull();
        });

        it('should allow get without type validation (backward compatibility)', async () => {
            await assetManager.load('img1', '/img/foo.png', 'image');

            const asset = assetManager.get('img1');
            expect(asset).toBe('loaded:mock');
        });

        it('should validate type and return asset on correct type', async () => {
            await assetManager.load('img1', '/img/foo.png', 'image');

            const asset = assetManager.get('img1', 'image');
            expect(asset).toBe('loaded:mock');
        });

        it('should detect type mismatch and return null with error', async () => {
            // Load as audio
            await assetManager.load('bgm', '/music.mp3', 'audio');

            // Try to get as image (WRONG TYPE)
            const asset = assetManager.get('bgm', 'image');

            // Should return null
            expect(asset).toBeNull();

            // Should have logged an error
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Type mismatch for asset 'bgm'"),
            );
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("expected 'image', got 'audio'"),
            );
        });

        it('should prevent silent type errors that crash renderers', async () => {
            // Scenario: Developer accidentally loads audio as 'texture'
            await assetManager.load('texture', '/sound.mp3', 'audio');

            // Later, renderer tries to get it as an image
            const texture = assetManager.get<HTMLImageElement>('texture', 'image');

            // With validation: Returns null, logs error, fails fast
            expect(texture).toBeNull();
            expect(mockLogger.error).toHaveBeenCalled();

            // Without validation (old behavior): Would return AudioBuffer disguised as Image
            // Renderer would crash at runtime with cryptic error
        });

        it('should validate multiple type mismatches independently', async () => {
            await assetManager.load('img1', '/img/foo.png', 'image');
            await assetManager.load('sfx1', '/snd/bar.mp3', 'audio');

            // Wrong type for img1
            expect(assetManager.get('img1', 'audio')).toBeNull();

            // Wrong type for sfx1
            expect(assetManager.get('sfx1', 'image')).toBeNull();

            // Correct types still work
            expect(assetManager.get('img1', 'image')).toBe('loaded:mock');
            expect(assetManager.get('sfx1', 'audio')).toBe('loaded:mock');

            // Should have logged exactly 2 errors (for the 2 mismatches)
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });
});