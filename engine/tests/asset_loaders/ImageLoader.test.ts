// engine/tests/asset_loaders/ImageLoader.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageLoader } from '@engine/systems/asset_loaders/ImageLoader';

// Mock the global Image constructor
const mockImage = {
    src: '',
    onload: () => {},
    onerror: () => {},
};

vi.stubGlobal('Image', vi.fn(() => mockImage));

describe('ImageLoader', () => {
    let loader: ImageLoader;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the mock image state
        mockImage.src = '';
        mockImage.onload = () => {};
        mockImage.onerror = () => {};

        loader = new ImageLoader();
    });

    it('should successfully load an image', async () => {
        const loadPromise = loader.load('path/to/image.png');

        // Check that the src was set
        expect(mockImage.src).toBe('path/to/image.png');

        // Manually trigger the onload callback
        mockImage.onload();

        // The promise should now resolve with the mock image
        await expect(loadPromise).resolves.toBe(mockImage);
    });

    it('should reject on image load error', async () => {
        const loadPromise = loader.load('path/to/bad.png');

        // Check that the src was set
        expect(mockImage.src).toBe('path/to/bad.png');

        // Manually trigger the onerror callback
        mockImage.onerror();

        // The promise should reject with a specific error
        await expect(loadPromise).rejects.toThrow('[ImageLoader] Failed to load: path/to/bad.png');
    });
});