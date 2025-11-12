// engine/tests/DomRenderer.test.ts

import {describe, it, expect, beforeEach, vi} from 'vitest';
import {DomRenderer} from '@engine/rendering/DomRenderer';
import {AssetManager} from '@engine/systems/AssetManager';
import type {RenderCommand} from '@engine/types/RenderingTypes';
import {DomRenderContainer} from '@engine/platform/browser/DomRenderContainer';
import type {ILogger} from "@engine/interfaces";

// Mock dependencies
vi.mock('@engine/systems/AssetManager');

// Mock browser Image
const mockImage = {src: 'mock-src.png', width: 100, height: 100};
vi.stubGlobal('Image', vi.fn(() => mockImage));
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
describe('DomRenderer', () => {
    let renderer: DomRenderer;
    let mockAssets: AssetManager;
    let container: HTMLElement;
    let renderContainer: DomRenderContainer;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAssets = new (vi.mocked(AssetManager))(vi.fn() as any, mockLogger);
        container = document.createElement('div');

        // Create real DomRenderContainer (animation provider can be null for tests)
        renderContainer = new DomRenderContainer(container, null);

        // Mock AssetManager.get to return the mock image
        vi.mocked(mockAssets.get).mockReturnValue(mockImage as any);

        renderer = new DomRenderer(mockAssets);
        renderer.init(renderContainer);
    });

    it('should initialize container styles', () => {
        expect(container.style.position).toBe('relative');
        expect(container.style.overflow).toBe('hidden');
    });

// engine/tests/DomRenderer.test.ts
    it('should clear all child elements', () => {
        // 1. Setup: Use the public .flush() method to add an element
        const cmd: RenderCommand = {
            type: 'rect', id: 'test_el', x: 0, y: 0, width: 10, height: 10
        };
        renderer.flush([cmd]);

        // 2. Pre-condition: Check that the element was added to the container
        expect(container.children).toHaveLength(1);

        // 3. Action: Call the public .clear() method
        renderer.clear();

        // 4. Result: Check that the element was removed from the container
        expect(container.children).toHaveLength(0);
    });

    it('should render an image command', () => {
        const cmd: RenderCommand = {
            type: 'image',
            id: 'img1',
            assetId: 'bg_forest',
            x: 10,
            y: 20,
            width: 50,
            height: 60,
            fit: 'cover'
        };

        renderer.flush([cmd]);

        const el = container.querySelector('#img1') as HTMLImageElement;
        expect(el).toBeInstanceOf(HTMLImageElement);
        expect(el.src).toContain('mock-src.png');
        expect(el.style.left).toBe('10px');
        expect(el.style.top).toBe('20px');
        expect(el.style.width).toBe('50px');
        expect(el.style.height).toBe('60px');
        expect(el.style.objectFit).toBe('cover');
    });

    it('should render a text command', () => {
        const cmd: RenderCommand = {
            type: 'text',
            id: 'txt1',
            text: 'Hello',
            x: 10,
            y: 20,
            style: {color: 'red', font: '16px Arial'}
        };

        renderer.flush([cmd]);

        const el = container.querySelector('#txt1') as HTMLDivElement;
        expect(el).toBeInstanceOf(HTMLDivElement);
        expect(el.textContent).toBe('Hello');
        expect(el.style.left).toBe('10px');
        expect(el.style.top).toBe('20px');
        expect(el.style.color).toBe('red');
        expect(el.style.font).toBe('16px Arial');
    });

    it('should render a rect command', () => {
        const cmd: RenderCommand = {
            type: 'rect',
            id: 'rect1',
            x: 10,
            y: 20,
            width: 100,
            height: 50,
            fill: 'blue',
            stroke: 'red'
        };

        renderer.flush([cmd]);

        const el = container.querySelector('#rect1') as HTMLDivElement;
        expect(el).toBeInstanceOf(HTMLDivElement);
        expect(el.style.left).toBe('10px');
        expect(el.style.top).toBe('20px');
        expect(el.style.width).toBe('100px');
        expect(el.style.height).toBe('50px');
        expect(el.style.backgroundColor).toBe('blue');
        expect(el.style.border).toBe('1px solid red');
    });

    it('should render a hotspot command with data attributes', () => {
        const cmd: RenderCommand = {
            type: 'hotspot',
            id: 'spot1',
            x: 10,
            y: 20,
            width: 100,
            height: 50,
            data: {'action': 'go-north', 'targetId': 123}
        };

        renderer.flush([cmd]);

        const el = container.querySelector('#spot1') as HTMLDivElement;
        expect(el).toBeInstanceOf(HTMLDivElement);
        expect(el.style.cursor).toBe('pointer');
        expect(el.dataset.action).toBe('go-north');
        expect(el.dataset.targetId).toBe('123');
    });

    it('should render commands in zIndex order', () => {
        const cmd1: RenderCommand = {type: 'rect', id: 'r1', x: 0, y: 0, width: 10, height: 10, zIndex: 10};
        const cmd2: RenderCommand = {type: 'rect', id: 'r2', x: 0, y: 0, width: 10, height: 10, zIndex: 5};

        renderer.flush([cmd1, cmd2]);

        const children = Array.from(container.children);
        expect(children[0].id).toBe('r2'); // zIndex 5
        expect(children[1].id).toBe('r1'); // zIndex 10
    });
});