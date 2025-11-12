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

        assetManager = new AssetManager(mockEventBus);
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
});