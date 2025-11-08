// engine/tests/asset_loaders/AudioLoader.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioLoader } from '@engine/systems/asset_loaders/AudioLoader';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock AudioContext
const mockAudioBuffer = { duration: 1.0 } as AudioBuffer;
const mockAudioContext = {
    decodeAudioData: vi.fn().mockResolvedValue(mockAudioBuffer),
};

describe('AudioLoader', () => {
    let loader: AudioLoader;

    beforeEach(() => {
        vi.clearAllMocks();
        loader = new AudioLoader(mockAudioContext as any);
    });

    it('should throw if no AudioContext is provided', () => {
        expect(() => new AudioLoader(null as any)).toThrow(
            '[AudioLoader] AudioContext is required.'
        );
    });

    it('should successfully load and decode audio', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        });

        const result = await loader.load('path/to/sound.mp3');

        expect(mockFetch).toHaveBeenCalledWith('path/to/sound.mp3');
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
        expect(result).toBe(mockAudioBuffer);
    });

    it('should reject on network error (response not ok)', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
        });

        await expect(loader.load('path/to/bad.mp3')).rejects.toThrow(
            '[AudioLoader] HTTP error 404 for path/to/bad.mp3'
        );
    });

    it('should reject on decode error', async () => {
        const mockArrayBuffer = new ArrayBuffer(8);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
        });

        // Mock decodeAudioData to fail
        const decodeError = new Error('Failed to decode');
        mockAudioContext.decodeAudioData.mockRejectedValue(decodeError);

        await expect(loader.load('path/to/corrupt.mp3')).rejects.toThrow('Failed to decode');
    });
});