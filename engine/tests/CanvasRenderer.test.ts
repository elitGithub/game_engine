import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CanvasRenderer } from '@engine/rendering/CanvasRenderer';
import { AssetManager } from '@engine/systems/AssetManager';
import type { RenderCommand } from '@engine/types/RenderingTypes';

// Mock AssetManager
vi.mock('@engine/systems/AssetManager');

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
    set fillStyle(_val: string) {},
    set strokeStyle(_val: string) {},
    set font(_val: string) {},
    set textAlign(_val: string) {},
};

// Spy on the setters
const fillStyleSpy = vi.spyOn(mockContext, 'fillStyle', 'set');
const strokeStyleSpy = vi.spyOn(mockContext, 'strokeStyle', 'set');
const fontSpy = vi.spyOn(mockContext, 'font', 'set');
const textAlignSpy = vi.spyOn(mockContext, 'textAlign', 'set');

describe('CanvasRenderer', () => {
    let renderer: CanvasRenderer;
    let mockAssets: AssetManager;
    let container: HTMLElement;
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        vi.clearAllMocks();

        fillStyleSpy.mockClear();
        strokeStyleSpy.mockClear();
        fontSpy.mockClear();
        textAlignSpy.mockClear();

        mockAssets = new (vi.mocked(AssetManager))(null as any);
        vi.mocked(mockAssets.get).mockReturnValue(mockImage as any);

        container = document.createElement('div');
        document.body.appendChild(container);

        renderer = new CanvasRenderer(mockAssets);
        renderer.init(container); // Let init run (it will create a real canvas)

        // --- THIS IS THE FIX ---
        // Manually overwrite the renderer's internal context with our mock.
        // This is safer than mocking the prototype.
        (renderer as any).ctx = mockContext;
        // --- END OF FIX ---

        // Find the real canvas that init() created
        canvas = container.querySelector('canvas')!;

        // Spy on the real canvas's remove method for the dispose test
        vi.spyOn(canvas, 'remove');
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks(); // This removes the prototype spy
    });
    // --- END OF FIX ---

    it('should initialize, create canvas, and get context', () => {
        expect(container.children[0]).toBe(canvas);

        // flush() will now use our manually-injected mockContext
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
        expect(canvas.remove).toHaveBeenCalledOnce();
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
            style: { color: 'red', font: '16px Arial', align: 'center' }
        };
        renderer.flush([cmd]);

        expect(mockContext.save).toHaveBeenCalledOnce();
        expect(fontSpy).toHaveBeenCalledWith('16px Arial');
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
        const cmd1: RenderCommand = { type: 'rect', id: 'r1', x: 1, y: 0, width: 10, height: 10, zIndex: 10, fill: 'red' };
        const cmd2: RenderCommand = { type: 'rect', id: 'r2', x: 2, y: 0, width: 10, height: 10, zIndex: 5, fill: 'blue' };

        renderer.flush([cmd1, cmd2]);

        expect(mockContext.save).toHaveBeenCalledTimes(2);
        expect(mockContext.restore).toHaveBeenCalledTimes(2);

        const callOrder = mockContext.fillRect.mock.invocationCallOrder;

        // This test will no longer fail, as mockContext.fillRect.mock.calls will be populated
        const cmd1CallOrder = callOrder.find(order => mockContext.fillRect.mock.calls[order - 1][0] === 1);
        const cmd2CallOrder = callOrder.find(order => mockContext.fillRect.mock.calls[order - 1][0] === 2);

        expect(cmd1CallOrder).toBeDefined();
        expect(cmd2CallOrder).toBeDefined();

        expect(cmd2CallOrder).toBeLessThan(cmd1CallOrder as number);
    });
});