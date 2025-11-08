// engine/tests/CDNAudioSourceAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CDNAudioSourceAdapter } from '@engine/systems/CDNAudioSourceAdapter';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock AudioContext
const mockAudioBuffer = { duration: 1.0 } as AudioBuffer;
const mockAudioContext = {
    decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
};

describe('CDNAudioSourceAdapter', () => {
    let adapter: CDNAudioSourceAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new CDNAudioSourceAdapter(mockAudioContext as any, {
            baseUrl: 'https://my-cdn.com/audio'
        });
    });

    it('should get a URL with default format', () => {
        expect(adapter.getUrl('theme')).toBe('https://my-cdn.com/audio/theme.mp3');
    });

    it('should get a URL with specified format', () => {
        adapter = new CDNAudioSourceAdapter(mockAudioContext as any, {
            baseUrl: 'https://my-cdn.com/audio',
            format: 'ogg'
        });
        expect(adapter.getUrl('theme')).toBe('https://my-cdn.com/audio/theme.ogg');
    });

    it('should not add format if already present', () => {
        expect(adapter.getUrl('theme.wav')).toBe('https://my-cdn.com/audio/theme.wav');
    });

    it('should add cache busting', () => {
        vi.spyOn(Date, 'now').mockReturnValue(123456789);
        adapter = new CDNAudioSourceAdapter(mockAudioContext as any, {
            baseUrl: 'https://my-cdn.com/audio',
            cacheBusting: true
        });
        expect(adapter.getUrl('theme')).toBe('https://my-cdn.com/audio/theme.mp3?v=123456789');
    });

    it('should load and cache an asset', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        });

        const result1 = await adapter.load('theme');
        expect(mockFetch).toHaveBeenCalledOnce();
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
        expect(result1).toBe(mockAudioBuffer);

        // Load again
        const result2 = await adapter.load('theme');
        expect(mockFetch).toHaveBeenCalledOnce(); // Should not fetch again
        expect(result2).toBe(mockAudioBuffer); // Should return from cache
    });

    it('should clear the cache', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        });

        await adapter.load('theme');
        adapter.clearCache();
        await adapter.load('theme');

        expect(mockFetch).toHaveBeenCalledTimes(2); // Fetched twice
    });
});