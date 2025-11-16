// Vitest setup file - runs before all tests
// This file provides mocks for browser APIs that jsdom doesn't fully support

import { vi } from 'vitest';

// Mock AudioContext for all tests
class MockAudioContext {
    state = 'suspended';
    sampleRate = 44100;
    currentTime = 0;
    destination = { maxChannelCount: 2 };

    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }

    createBuffer() {
        return {
            duration: 0,
            numberOfChannels: 2,
            sampleRate: 44100,
            length: 0,
            getChannelData: () => new Float32Array(0)
        };
    }

    async decodeAudioData() {
        return {
            duration: 0,
            numberOfChannels: 2,
            sampleRate: 44100,
            length: 0,
            getChannelData: () => new Float32Array(0)
        };
    }

    createBufferSource() {
        return {
            buffer: null,
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            playbackRate: { value: 1.0 },
            start: vi.fn(),
            stop: vi.fn(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            onended: null
        };
    }

    createGain() {
        return {
            gain: { value: 1.0, linearRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
            disconnect: vi.fn(),
            context: this
        };
    }
}

// Stub AudioContext globally
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

// Mock requestAnimationFrame/cancelAnimationFrame if not present
if (typeof window !== 'undefined') {
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (callback: FrameRequestCallback) => {
            return window.setTimeout(callback, 16) as unknown as number;
        };
    }
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (id: number) => {
            window.clearTimeout(id);
        };
    }
}
