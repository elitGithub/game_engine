// engine/tests/asset_loaders/JsonLoader.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JsonLoader } from '@engine/systems/asset_loaders/JsonLoader';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('JsonLoader', () => {
    let loader: JsonLoader;

    beforeEach(() => {
        vi.clearAllMocks();
        loader = new JsonLoader();
    });

    it('should successfully load and parse JSON', async () => {
        const mockData = { key: 'value' };
        mockFetch.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(mockData),
        });

        const result = await loader.load('path/to/data.json');

        expect(mockFetch).toHaveBeenCalledWith('path/to/data.json');
        expect(result).toEqual(mockData);
    });

    it('should reject on network error (response not ok)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
        });

        await expect(loader.load('path/to/bad.json')).rejects.toThrow(
            '[JsonLoader] HTTP error 404 for path/to/bad.json'
        );
    });

    it('should reject on fetch failure (e.g., network down)', async () => {
        mockFetch.mockRejectedValue(new Error('Network failure'));

        await expect(loader.load('path/to/data.json')).rejects.toThrow('Network failure');
    });
});