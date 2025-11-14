// engine/tests/asset_loaders/AudioLoader.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {AudioLoader} from "@engine/platform/browser/asset_loaders/AudioLoader";
import type {INetworkProvider} from "@engine/interfaces";


import type {IAudioBuffer, IAudioContext} from "@engine/interfaces/IAudioPlatform";
import {createMockLogger} from "@engine/tests/helpers/loggerMocks";

// Mock fetch function
const mockFetch = vi.fn();

// Mock INetworkProvider
const mockNetworkProvider: INetworkProvider = {
    fetch: mockFetch
};

// Mock IAudioBuffer
const mockAudioBuffer: IAudioBuffer = {
    duration: 1.0,
    numberOfChannels: 2,
    sampleRate: 44100,
    length: 44100
};

// Mock IAudioContext
const mockDecodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
const mockAudioContext: Partial<IAudioContext> = {
    decodeAudioData: mockDecodeAudioData,
};

const mockLogger = createMockLogger();

describe('AudioLoader', () => {
    let loader: AudioLoader;

    beforeEach(() => {
        vi.clearAllMocks();
        loader = new AudioLoader(mockAudioContext as IAudioContext, mockNetworkProvider, mockLogger);
    });

    it('should throw if no AudioContext is provided', () => {
        expect(() => new AudioLoader(null as any, mockNetworkProvider, mockLogger)).toThrow(
            '[AudioLoader] AudioContext is required.'
        );
    });

    // [NEW TEST]
    it('should throw if no platformFetch is provided', () => {
        // Pass a valid audioContext, but null for the networkProvider
        expect(() => new AudioLoader(mockAudioContext as IAudioContext, null as any, mockLogger)).toThrow(
            '[AudioLoader] A platform-specific fetch implementation is required.'
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
        expect(mockDecodeAudioData).toHaveBeenCalledWith(mockArrayBuffer);
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
        mockDecodeAudioData.mockRejectedValue(decodeError);

        await expect(loader.load('path/to/corrupt.mp3')).rejects.toThrow('Failed to decode');
    });
});