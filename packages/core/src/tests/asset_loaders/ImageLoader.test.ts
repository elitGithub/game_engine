// engine/tests/asset_loaders/ImageLoader.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ImageLoader} from "@game-engine/core/platform/browser/asset_loaders/ImageLoader";


// Mock the global Image constructor
const mockImage = {src: '',};

describe('ImageLoader', () => {
    let loader: ImageLoader;

    // FIX 3: Define the mock function here so we can change it in tests
    let mockPlatformLoadImage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset the mock image state
        mockImage.src = '';

        // FIX 4: Create a mock function that successfully resolves
        mockPlatformLoadImage = vi.fn(async (src: string) => {
            mockImage.src = src;
            return mockImage as unknown as HTMLImageElement;
        });
       const mockImageLoaderProvider = { loadImage: mockPlatformLoadImage };
        // FIX 5: Inject the mock function
        loader = new ImageLoader(mockImageLoaderProvider);
    });

    it('should successfully load an image', async () => {
        // The loader just calls our mock function
        const result = await loader.load('path/to/image.png');

        // Test that the mock was called
        expect(mockPlatformLoadImage).toHaveBeenCalledWith('path/to/image.png');
        // Test that it returned the correct object
        expect(result).toBe(mockImage);
        expect(result.src).toBe('path/to/image.png');
    });

    // FIX 6: This is the new, correct way to test for an error
    it('should reject if the platform function rejects', async () => {
        // Create the specific error we expect
        const loadError = new Error('Platform failed to load image');

        // Overwrite the mock implementation for *this test only*
        mockPlatformLoadImage.mockRejectedValue(loadError);

        // The loader.load() call will now reject with the error we just defined
        await expect(loader.load('path/to/bad.png')).rejects.toThrow('Platform failed to load image');

        // We can still test that it was called
        expect(mockPlatformLoadImage).toHaveBeenCalledWith('path/to/bad.png');
    });
});