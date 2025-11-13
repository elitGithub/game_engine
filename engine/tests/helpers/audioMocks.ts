/**
 * Shared audio mocks for testing
 * Provides platform-agnostic audio interface implementations for tests
 */

import { vi } from 'vitest';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain, IAudioDestination } from '@engine/interfaces/IAudioPlatform';

/**
 * Create a mock IAudioSource
 */
export const createMockSource = (): IAudioSource => ({
    start: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    setLoop: vi.fn(),
});

/**
 * Create a mock IAudioGain
 */
export const createMockGain = (): IAudioGain => {
    let value = 1.0;
    return {
        getValue: vi.fn(() => value),
        setValue: vi.fn((v: number) => { value = v; }),
        fadeTo: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    };
};

/**
 * Create a mock IAudioBuffer
 */
export const createMockBuffer = (duration: number = 10.0): IAudioBuffer => ({
    duration,
    numberOfChannels: 2,
    sampleRate: 44100,
    length: duration * 44100,
});

/**
 * Create a mock IAudioContext
 */
export const createMockAudioContext = (): IAudioContext => {
    let currentTime = 0;
    const mockDestination: IAudioDestination = { maxChannelCount: 2 };

    return {
        state: 'running' as const,
        sampleRate: 44100,
        get currentTime() { return currentTime; },
        resume: vi.fn(async () => {}),
        suspend: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
        createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => createMockBuffer(length / sampleRate)),
        decodeAudioData: vi.fn(async (data: ArrayBuffer) => createMockBuffer()),
        createSource: vi.fn((buffer: IAudioBuffer) => createMockSource()),
        createGain: vi.fn(() => createMockGain()),
        getDestination: vi.fn(() => mockDestination),
    } as IAudioContext;
};
