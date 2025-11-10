// engine/tests/RenderManager.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RenderManager} from '@engine/core/RenderManager';
import {EventBus} from '@engine/core/EventBus';
import type {IRenderer, RenderCommand} from '@engine/types/RenderingTypes';
import type { IDomRenderContainer } from '@engine/interfaces/IRenderContainer';

// Mock dependencies
vi.mock('@engine/core/EventBus');

const mockRenderer: IRenderer = {
    init: vi.fn(),
    clear: vi.fn(),
    flush: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
};

describe('RenderManager', () => {
    let renderManager: RenderManager;
    let mockEventBus: EventBus;
    let mockContainer: HTMLElement;
    let renderContainer: IDomRenderContainer;

    beforeEach(() => {
        vi.clearAllMocks();

        mockEventBus = new EventBus();
        mockContainer = document.createElement('div');

        // Create mock IDomRenderContainer
        renderContainer = {
            getType: () => 'dom',
            getElement: () => mockContainer,
            getDimensions: () => ({ width: 800, height: 600 }),
            setDimensions: (_width: number, _height: number) => true,
            getPixelRatio: () => 1.0,
            requestAnimationFrame: (callback: () => void) => {
                const id = setTimeout(callback, 16);
                return () => clearTimeout(id);
            }
        };

        renderManager = new RenderManager(
            {type: 'dom'},
            mockEventBus,
            renderContainer,
            mockRenderer
        );
    });

    it('should initialize the renderer', () => {
        expect(mockRenderer.init).toHaveBeenCalledWith(renderContainer);
    });

    it('should push commands to scene and UI queues', () => {
        const sceneCmd: RenderCommand = {type: 'sprite', id: 's1', assetId: 'a', x: 0, y: 0};
        const uiCmd: RenderCommand = {type: 'text', id: 't1', text: 'hi', x: 0, y: 0, style: {}};

        renderManager.pushSceneCommand(sceneCmd);
        renderManager.pushUICommand(uiCmd);

        // Verify by flushing and checking renderer received the commands
        renderManager.flush();

        expect(mockRenderer.flush).toHaveBeenCalledWith([sceneCmd]);
        expect(mockRenderer.flush).toHaveBeenCalledWith([uiCmd]);
    });

    it('should call renderer.clear() if a clear command exists', () => {
        renderManager.pushSceneCommand({type: 'clear'});
        renderManager.pushUICommand({type: 'text', id: 't1', text: 'hi', x: 0, y: 0, style: {}});

        renderManager.flush();

        expect(mockRenderer.clear).toHaveBeenCalledOnce();
        expect(mockRenderer.flush).toHaveBeenCalledTimes(1); // UI queue
    });

    it('should flush queues in order: scene then UI', () => {
        const sceneCmd: RenderCommand = {type: 'sprite', id: 's1', assetId: 'a', x: 0, y: 0};
        const uiCmd: RenderCommand = {type: 'text', id: 't1', text: 'hi', x: 0, y: 0, style: {}};

        renderManager.pushSceneCommand(sceneCmd);
        renderManager.pushUICommand(uiCmd);

        renderManager.flush();

        // Flushed twice: once for scene, once for UI
        expect(mockRenderer.flush).toHaveBeenCalledTimes(2);
        expect(mockRenderer.flush).toHaveBeenNthCalledWith(1, [sceneCmd]);
        expect(mockRenderer.flush).toHaveBeenNthCalledWith(2, [uiCmd]);

        // Verify queues are empty by flushing again (should not call renderer)
        vi.clearAllMocks();
        renderManager.flush();
        expect(mockRenderer.flush).not.toHaveBeenCalled();
    });

    it('should sort commands by zIndex before flushing', () => {
        const cmd1: RenderCommand = {type: 'sprite', id: 's1', assetId: 'a', x: 0, y: 0, zIndex: 10};
        const cmd2: RenderCommand = {type: 'sprite', id: 's2', assetId: 'b', x: 0, y: 0, zIndex: 5};
        const cmd3: RenderCommand = {type: 'sprite', id: 's3', assetId: 'c', x: 0, y: 0}; // zIndex 0
        const clearCmd: RenderCommand = {type: 'clear'};

        renderManager.pushSceneCommand(cmd1);
        renderManager.pushSceneCommand(cmd2);
        renderManager.pushSceneCommand(cmd3);
        renderManager.pushSceneCommand(clearCmd); // Should be filtered

        renderManager.flush();

        expect(mockRenderer.clear).toHaveBeenCalled();
        expect(mockRenderer.flush).toHaveBeenCalledWith([cmd3, cmd2, cmd1]); // Sorted by zIndex
    });

    it('should call resize on renderer', () => {
        renderManager.resize(800, 600);
        expect(mockRenderer.resize).toHaveBeenCalledWith(800, 600);
    });

    it('should call dispose on renderer', () => {
        renderManager.dispose();
        expect(mockRenderer.dispose).toHaveBeenCalledOnce();
    });
});