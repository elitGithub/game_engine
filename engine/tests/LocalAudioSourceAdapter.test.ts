// engine/tests/LocalAudioSourceAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalAudioSourceAdapter } from '@engine/systems/LocalAudioSourceAdapter';
import type { AudioAssetMap } from '@engine/core/AudioSourceAdapter';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock AudioContext
const mockAudioBuffer = { duration: 1.0 } as AudioBuffer;
const mockAudioContext = {
    decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
};

describe('LocalAudioSourceAdapter', () => {
    let adapter: LocalAudioSourceAdapter;
    const assetMap: AudioAssetMap = {
        'theme': '/audio/theme.mp3',
        'click': '/audio/click.wav'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new LocalAudioSourceAdapter(mockAudioContext as any, assetMap);
    });

    it('should get a URL from the asset map', () => {
        expect(adapter.getUrl('theme')).toBe('/audio/theme.mp3');
    });

    it('should return empty string for unknown ID', () => {
        expect(adapter.getUrl('unknown')).toBe('');
    });

    it('should load and cache an asset', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        });

        const result1 = await adapter.load('theme');
        expect(mockFetch).toHaveBeenCalledWith('/audio/theme.mp3');
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
        expect(result1).toBe(mockAudioBuffer);

        // Load again
        const result2 = await adapter.load('theme');
        expect(mockFetch).toHaveBeenCalledOnce(); // Not fetched again
        expect(result2).toBe(mockAudioBuffer); // From cache
    });

    it('should throw if asset ID is not in map', async () => {
        await expect(adapter.load('unknown')).rejects.toThrow(
            "Audio asset 'unknown' not found in asset map"
        );
    });

    it('should update the asset map', () => {
        adapter.updateAssetMap({ 'new_sound': '/audio/new.mp3' });
        expect(adapter.getUrl('new_sound')).toBe('/audio/new.mp3');
        expect(adapter.getUrl('theme')).toBe('/audio/theme.mp3'); // Old ones persist
    });
});