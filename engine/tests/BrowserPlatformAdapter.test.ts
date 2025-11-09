// engine/tests/BrowserPlatformAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserPlatformAdapter } from '@engine/platform/BrowserPlatformAdapter';
import type { BrowserPlatformConfig } from '@engine/platform/BrowserPlatformAdapter';

// Mock browser globals
const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

vi.stubGlobal('navigator', {
    userAgent: mockUserAgent
});

vi.stubGlobal('AudioContext', vi.fn(() => ({
    state: 'suspended',
    sampleRate: 44100,
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createBuffer: vi.fn(),
    decodeAudioData: vi.fn(),
    createBufferSource: vi.fn(),
    createGain: vi.fn(),
    destination: {}
})));

// Mock canvas context
const mockCanvasContext = {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn()
};

describe('BrowserPlatformAdapter', () => {
    let containerDiv: HTMLDivElement;
    let containerCanvas: HTMLCanvasElement;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock DOM elements
        containerDiv = document.createElement('div');
        containerDiv.id = 'game-container-div';

        containerCanvas = document.createElement('canvas');
        containerCanvas.id = 'game-container-canvas';
        containerCanvas.width = 800;
        containerCanvas.height = 600;

        // Mock canvas.getContext()
        vi.spyOn(containerCanvas, 'getContext').mockReturnValue(mockCanvasContext as any);
    });

    describe('Initialization', () => {
        it('should initialize with correct platform type', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.type).toBe('browser');
            expect(platform.name).toBe('Chrome');
        });

        it('should detect browser version', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.version).toBe('120.0');
        });

        it('should use default configuration values', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            const capabilities = platform.getCapabilities();
            expect(capabilities.audio).toBe(true); // Default audio: true
            expect(capabilities.input).toBe(true); // Default input: true
        });
    });

    describe('Render Container (Singleton)', () => {
        it('should create DOM render container for div element', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                renderType: 'auto'
            };
            const platform = new BrowserPlatformAdapter(config);

            const container1 = platform.getRenderContainer();
            expect(container1).toBeDefined();
            expect(container1.getType()).toBe('dom');
        });

        it('should create Canvas render container for canvas element', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerCanvas,
                renderType: 'auto'
            };
            const platform = new BrowserPlatformAdapter(config);

            const container1 = platform.getRenderContainer();
            expect(container1).toBeDefined();
            expect(container1.getType()).toBe('canvas');
        });

        it('should force DOM render type even with div', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                renderType: 'dom'
            };
            const platform = new BrowserPlatformAdapter(config);

            const container = platform.getRenderContainer();
            expect(container.getType()).toBe('dom');
        });

        it('should force Canvas render type with canvas element', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerCanvas,
                renderType: 'canvas'
            };
            const platform = new BrowserPlatformAdapter(config);

            const container = platform.getRenderContainer();
            expect(container.getType()).toBe('canvas');
        });

        it('should throw error when forcing Canvas with div element', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                renderType: 'canvas'
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(() => platform.getRenderContainer()).toThrow(
                '[BrowserPlatform] Canvas rendering requires HTMLCanvasElement'
            );
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            const container1 = platform.getRenderContainer();
            const container2 = platform.getRenderContainer();
            const container3 = platform.getRenderContainer();

            expect(container1).toBe(container2);
            expect(container2).toBe(container3);
        });
    });

    describe('Audio Platform (Singleton)', () => {
        it('should create audio platform when enabled', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: true
            };
            const platform = new BrowserPlatformAdapter(config);

            const audio = platform.getAudioPlatform();
            expect(audio).toBeDefined();
            expect(audio!.getType()).toBe('webaudio');
        });

        it('should return undefined when audio disabled', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: false
            };
            const platform = new BrowserPlatformAdapter(config);

            const audio = platform.getAudioPlatform();
            expect(audio).toBeUndefined();
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: true
            };
            const platform = new BrowserPlatformAdapter(config);

            const audio1 = platform.getAudioPlatform();
            const audio2 = platform.getAudioPlatform();
            const audio3 = platform.getAudioPlatform();

            expect(audio1).toBe(audio2);
            expect(audio2).toBe(audio3);
        });
    });

    describe('Storage Adapter (Singleton)', () => {
        it('should create storage adapter', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            const storage = platform.getStorageAdapter();
            expect(storage).toBeDefined();
        });

        it('should use custom storage prefix', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                storagePrefix: 'custom_prefix_'
            };
            const platform = new BrowserPlatformAdapter(config);

            const storage = platform.getStorageAdapter();
            expect(storage).toBeDefined();
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            const storage1 = platform.getStorageAdapter();
            const storage2 = platform.getStorageAdapter();
            const storage3 = platform.getStorageAdapter();

            expect(storage1).toBe(storage2);
            expect(storage2).toBe(storage3);
        });
    });

    describe('Input Adapter (Singleton)', () => {
        it('should create input adapter when enabled', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                input: true
            };
            const platform = new BrowserPlatformAdapter(config);

            const input = platform.getInputAdapter();
            expect(input).toBeDefined();
            expect(input!.getType()).toBe('dom');
        });

        it('should return undefined when input disabled', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                input: false
            };
            const platform = new BrowserPlatformAdapter(config);

            const input = platform.getInputAdapter();
            expect(input).toBeUndefined();
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                input: true
            };
            const platform = new BrowserPlatformAdapter(config);

            const input1 = platform.getInputAdapter();
            const input2 = platform.getInputAdapter();
            const input3 = platform.getInputAdapter();

            expect(input1).toBe(input2);
            expect(input2).toBe(input3);
        });
    });

    describe('Capabilities', () => {
        it('should report correct capabilities', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: true,
                input: true
            };
            const platform = new BrowserPlatformAdapter(config);

            const caps = platform.getCapabilities();
            expect(caps.rendering).toBe(true);
            expect(caps.audio).toBe(true);
            expect(caps.input).toBe(true);
            expect(caps.storage).toBe(true);
            expect(caps.network).toBe(true);
            expect(caps.realtime).toBe(true);
        });

        it('should report audio false when disabled', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: false
            };
            const platform = new BrowserPlatformAdapter(config);

            const caps = platform.getCapabilities();
            expect(caps.audio).toBe(false);
        });
    });

    describe('Lifecycle', () => {
        it('should initialize without error', async () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            await expect(platform.initialize()).resolves.toBeUndefined();
        });

        it('should dispose all resources', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv,
                audio: true,
                input: true
            };
            const platform = new BrowserPlatformAdapter(config);

            // Create all singletons
            platform.getRenderContainer();
            const audio = platform.getAudioPlatform();
            platform.getStorageAdapter();
            platform.getInputAdapter();

            // Spy on dispose methods
            const disposeSpy = vi.spyOn(audio!, 'dispose');

            platform.dispose();

            // Verify audio was disposed
            expect(disposeSpy).toHaveBeenCalled();

            // Verify singletons are cleared (new instances created)
            const newContainer = platform.getRenderContainer();
            expect(newContainer).toBeDefined(); // Should create new instance
        });
    });

    describe('Browser Detection', () => {
        it('should detect Chrome browser', () => {
            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.name).toBe('Chrome');
        });

        it('should detect Firefox browser', () => {
            vi.stubGlobal('navigator', {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0'
            });

            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.name).toBe('Firefox');
        });

        it('should detect Safari browser', () => {
            vi.stubGlobal('navigator', {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
            });

            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.name).toBe('Safari');
        });

        it('should detect Edge browser', () => {
            vi.stubGlobal('navigator', {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
            });

            const config: BrowserPlatformConfig = {
                containerElement: containerDiv
            };
            const platform = new BrowserPlatformAdapter(config);

            expect(platform.name).toBe('Edge');
        });
    });
});
