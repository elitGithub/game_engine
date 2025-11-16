import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { CanvasRenderer } from '@game-engine/core/rendering/CanvasRenderer';
import { AssetManager } from '@game-engine/core/systems/AssetManager';
import type { RenderCommand } from '@game-engine/core/types/RenderingTypes';
import type { ICanvasRenderContainer } from '@game-engine/core/interfaces/IRenderContainer';
import { createMockLogger } from './helpers/loggerMocks';

// Mock AssetManager
vi.mock('@game-engine/core/systems/AssetManager');

// Mock the browser's Image
const mockImage = { src: 'mock-src.png', width: 100, height: 100 };
vi.stubGlobal('Image', vi.fn(() => mockImage));

// --- Create mock for the 2D context ---
const mockContext = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    set fillStyle(_val: string) {
    },
    set strokeStyle(_val: string) {
    },
    set font(_val: string) {
    },
    set textAlign(_val: string) {
    },
};

const mockLogger = createMockLogger();

describe('CanvasRenderer', () => {
    let renderer: CanvasRenderer;
    let mockAssets: AssetManager;
    let container: HTMLElement;
    let canvas: HTMLCanvasElement;
    let renderContainer: ICanvasRenderContainer;

    // --- FIX 1: Define ALL spies here as 'let' ---
    let fillStyleSpy: MockInstance;
    let strokeStyleSpy: MockInstance;
    let fontSpy: MockInstance;
    let textAlignSpy: MockInstance;
    let contextSpy: MockInstance;
    let canvasRemoveSpy: MockInstance;

    beforeEach(() => {
        // --- FIX 2: Create spies inside beforeEach ---
        fillStyleSpy = vi.spyOn(mockContext, 'fillStyle', 'set');
        strokeStyleSpy = vi.spyOn(mockContext, 'strokeStyle', 'set');
        fontSpy = vi.spyOn(mockContext, 'font', 'set');
        textAlignSpy = vi.spyOn(mockContext, 'textAlign', 'set');
        contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext as any);

        // --- FIX 3: Use mockReset() for vi.fn() mocks ---
        mockContext.clearRect.mockReset();
        mockContext.save.mockReset();
        mockContext.restore.mockReset();
        mockContext.drawImage.mockReset();
        mockContext.fillText.mockReset();
        mockContext.fillRect.mockReset(); // This clears .calls AND .invocationCallOrder
        mockContext.strokeRect.mockReset();

        // No need to .mockClear() spies we just created

        mockAssets = new (vi.mocked(AssetManager))(null as any, mockLogger);
        vi.mocked(mockAssets.get).mockReturnValue(mockImage as any);

        container = document.createElement('div');
        document.body.appendChild(container);

        // Create canvas element
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        container.appendChild(canvas);

        // Create mock ICanvasRenderContainer
        renderContainer = {
            getType: () => 'canvas',
            getCanvas: () => canvas,
            getContext: () => mockContext as any,
            getDimensions: () => ({ width: 800, height: 600 }),
            setDimensions: (_width: number, _height: number) => true,
            getPixelRatio: () => 1.0,
            requestAnimationFrame: (callback: () => void) => {
                const id = setTimeout(callback, 16);
                return () => clearTimeout(id);
            }
        };

        renderer = new CanvasRenderer(mockAssets, mockLogger);
        renderer.init(renderContainer); // Use render container instead of raw HTMLElement

        // Spy on the *instance* of the canvas
        canvasRemoveSpy = vi.spyOn(canvas, 'remove');
    });

    afterEach(() => {
        container.remove();

        // --- FIX 4: Manually restore all spies and DO NOT use restoreAllMocks ---
        fillStyleSpy.mockRestore();
        strokeStyleSpy.mockRestore();
        fontSpy.mockRestore();
        textAlignSpy.mockRestore();
        contextSpy.mockRestore();
        canvasRemoveSpy.mockRestore();
    });

    it('should initialize, create canvas, and get context', () => {
        expect(container.children[0]).toBe(canvas);
        renderer.flush([]);
        expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it('should clear the canvas', () => {
        renderer.resize(800, 600);
        renderer.clear();
        expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should call resize', () => {
        renderer.resize(1024, 768);
        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);
    });

    it('should call dispose', () => {
        renderer.dispose();
        expect(canvasRemoveSpy).toHaveBeenCalledOnce(); // Use the spy
    });

    it('should flush and render an image command', () => {
        const cmd: RenderCommand = {
            type: 'image', id: 'img1', assetId: 'test_img', x: 10, y: 20
        };
        renderer.flush([cmd]);

        expect(mockContext.save).toHaveBeenCalledOnce();
        expect(mockAssets.get).toHaveBeenCalledWith('test_img');
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 10, 20, 100, 100);
        expect(mockContext.restore).toHaveBeenCalledOnce();
    });

    it('should flush and render a text command', () => {
        const cmd: RenderCommand = {
            type: 'text', id: 'txt1', text: 'Hello', x: 10, y: 20,
            style: { color: 'red', fontSize: '16px', fontFamily: 'Arial', textAlign: 'center' }
        };
        renderer.flush([cmd]);

        expect(mockContext.save).toHaveBeenCalledOnce();
        expect(fontSpy).toHaveBeenCalledWith('normal normal 16px Arial');
        expect(fillStyleSpy).toHaveBeenCalledWith('red');
        expect(textAlignSpy).toHaveBeenCalledWith('center');
        expect(mockContext.fillText).toHaveBeenCalledWith('Hello', 10, 20);
        expect(mockContext.restore).toHaveBeenCalledOnce();
    });

    it('should flush and render a rect command', () => {
        const cmd: RenderCommand = {
            type: 'rect', id: 'rect1', x: 10, y: 20, width: 50, height: 60,
            fill: 'blue', stroke: 'red'
        };
        renderer.flush([cmd]);

        expect(mockContext.save).toHaveBeenCalledTimes(1);
        expect(fillStyleSpy).toHaveBeenCalledWith('blue');
        expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, 50, 60);
        expect(strokeStyleSpy).toHaveBeenCalledWith('red');
        expect(mockContext.strokeRect).toHaveBeenCalledWith(10, 20, 50, 60);
        expect(mockContext.restore).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for a hotspot command', () => {
        const cmd: RenderCommand = { type: 'hotspot', id: 'spot1', x: 0, y: 0, width: 10, height: 10 };
        renderer.flush([cmd]);

        expect(mockContext.save).toHaveBeenCalledOnce();
        expect(mockContext.restore).toHaveBeenCalledOnce();
        expect(mockContext.drawImage).not.toHaveBeenCalled();
        expect(mockContext.fillText).not.toHaveBeenCalled();
        expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    it('should sort commands by zIndex before rendering', () => {
        const cmd1: RenderCommand = {
            type: 'rect',
            id: 'r1',
            x: 1,
            y: 0,
            width: 10,
            height: 10,
            zIndex: 10,
            fill: 'red'
        };
        const cmd2: RenderCommand = {
            type: 'rect',
            id: 'r2',
            x: 2,
            y: 0,
            width: 10,
            height: 10,
            zIndex: 5,
            fill: 'blue'
        };

        renderer.flush([cmd1, cmd2]);

        expect(mockContext.save).toHaveBeenCalledTimes(2);
        expect(mockContext.restore).toHaveBeenCalledTimes(2);
        const calls = mockContext.fillRect.mock.calls;

        expect(calls[0][0]).toBe(2);
        expect(calls[1][0]).toBe(1);
    });
});