import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneRenderer } from '@game-engine/core/rendering/helpers/SceneRenderer';
import { Scene } from '@game-engine/core/systems/Scene';
import type { RenderCommand } from '@game-engine/core/types/RenderingTypes';
import { createMockLogger } from './helpers/loggerMocks';

// Mock the Scene class
class MockScene extends Scene {
    constructor(id: string, data: any) {
        super(id, 'mock', data);
    }
}

const mockLogger = createMockLogger();

describe('SceneRenderer', () => {
    let renderer: SceneRenderer;

    beforeEach(() => {
        renderer = new SceneRenderer(mockLogger);
    });

    it('should return a fallback background sprite if no layers exist', () => {
        const scene = new MockScene('scene1', {
            backgroundAsset: 'bg_forest'
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(1);

        // FIX: Assert the type before accessing properties
        const cmd = commands[0] as Extract<RenderCommand, { type: 'sprite' }>;

        expect(cmd.type).toBe('sprite');
        expect(cmd.id).toBe('scene_background');
        expect(cmd.assetId).toBe('bg_forest');
        expect(cmd.x).toBe(0);
        expect(cmd.y).toBe(0);
        expect(cmd.zIndex).toBe(0);
    });

    it('should render sprite, rect, and text layers', () => {
        const scene = new MockScene('scene2', {
            layers: [
                { type: 'sprite', assetId: 'bg', x: 0, y: 0, zIndex: 0 },
                { type: 'sprite', assetId: 'char', x: 100, y: 50, zIndex: 10 },
                { type: 'rect', x: 200, y: 100, width: 300, height: 200, fill: 'rgba(0,0,0,0.5)', stroke: 'white', zIndex: 5 },
                { type: 'text', text: 'Hello World', x: 250, y: 150, style: { color: 'white', fontSize: '24px', fontFamily: 'Arial' }, zIndex: 15 }
            ]
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(4);

        // Sprite layer 0
        const bgCmd = commands[0] as Extract<RenderCommand, { type: 'sprite' }>;
        expect(bgCmd.type).toBe('sprite');
        expect(bgCmd.assetId).toBe('bg');
        expect(bgCmd.id).toBe('scene_layer_0');
        expect(bgCmd.zIndex).toBe(0);

        // Sprite layer 1
        const charCmd = commands[1] as Extract<RenderCommand, { type: 'sprite' }>;
        expect(charCmd.type).toBe('sprite');
        expect(charCmd.assetId).toBe('char');
        expect(charCmd.id).toBe('scene_layer_1');
        expect(charCmd.x).toBe(100);
        expect(charCmd.y).toBe(50);
        expect(charCmd.zIndex).toBe(10);

        // Rect layer 2
        const rectCmd = commands[2] as Extract<RenderCommand, { type: 'rect' }>;
        expect(rectCmd.type).toBe('rect');
        expect(rectCmd.id).toBe('scene_layer_2');
        expect(rectCmd.x).toBe(200);
        expect(rectCmd.y).toBe(100);
        expect(rectCmd.width).toBe(300);
        expect(rectCmd.height).toBe(200);
        expect(rectCmd.fill).toBe('rgba(0,0,0,0.5)');
        expect(rectCmd.stroke).toBe('white');
        expect(rectCmd.zIndex).toBe(5);

        // Text layer 3
        const textCmd = commands[3] as Extract<RenderCommand, { type: 'text' }>;
        expect(textCmd.type).toBe('text');
        expect(textCmd.id).toBe('scene_layer_3');
        expect(textCmd.text).toBe('Hello World');
        expect(textCmd.x).toBe(250);
        expect(textCmd.y).toBe(150);
        expect(textCmd.style.color).toBe('white');
        expect(textCmd.style.fontSize).toBe('24px');
        expect(textCmd.style.fontFamily).toBe('Arial');
        expect(textCmd.zIndex).toBe(15);
    });

    it('should use array index as fallback zIndex for layers', () => {
        const scene = new MockScene('scene3', {
            layers: [
                { type: 'sprite', assetId: 'layer1' }, // No zIndex
                { type: 'sprite', assetId: 'layer2', zIndex: 5 },
                { type: 'sprite', assetId: 'layer3' }  // No zIndex
            ]
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(3);

        // FIX: Assert types before accessing zIndex
        const cmd0 = commands[0] as Extract<RenderCommand, { type: 'sprite' }>;
        const cmd1 = commands[1] as Extract<RenderCommand, { type: 'sprite' }>;
        const cmd2 = commands[2] as Extract<RenderCommand, { type: 'sprite' }>;

        expect(cmd0.zIndex).toBe(0); // Fallback to index
        expect(cmd1.zIndex).toBe(5); // Uses provided zIndex
        expect(cmd2.zIndex).toBe(2); // Fallback to index
    });

    it('should not render fallback if layers array is empty', () => {
        const scene = new MockScene('scene4', {
            backgroundAsset: 'bg_forest',
            layers: [] // Explicitly empty
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(0); // Empty layers array takes precedence
    });

    it('should return empty array for a scene with no visual data', () => {
        const scene = new MockScene('scene5', {
            text: 'This scene only has text'
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(0);
    });

    it('should skip rect layers with missing width or height and log warning', () => {
        const scene = new MockScene('scene6', {
            layers: [
                { type: 'rect', x: 0, y: 0 }, // Missing width and height
                { type: 'rect', x: 0, y: 0, width: 100 }, // Missing height
                { type: 'rect', x: 0, y: 0, width: 100, height: 50, fill: 'red' } // Valid
            ]
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(1);
        expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith("[SceneRenderer] 'rect' layer at index 0 is missing 'width' or 'height'");
        expect(mockLogger.warn).toHaveBeenCalledWith("[SceneRenderer] 'rect' layer at index 1 is missing 'width' or 'height'");

        const rectCmd = commands[0] as Extract<RenderCommand, { type: 'rect' }>;
        expect(rectCmd.type).toBe('rect');
        expect(rectCmd.width).toBe(100);
        expect(rectCmd.height).toBe(50);
    });

    it('should skip text layers with missing text or style and log warning', () => {
        vi.clearAllMocks();

        const scene = new MockScene('scene7', {
            layers: [
                { type: 'text', x: 0, y: 0 }, // Missing text and style
                { type: 'text', text: 'Hello', x: 0, y: 0 }, // Missing style
                { type: 'text', text: 'World', x: 0, y: 0, style: { color: 'white' } } // Valid
            ]
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(1);
        expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledWith("[SceneRenderer] 'text' layer at index 0 is missing 'text' or 'style'");
        expect(mockLogger.warn).toHaveBeenCalledWith("[SceneRenderer] 'text' layer at index 1 is missing 'text' or 'style'");

        const textCmd = commands[0] as Extract<RenderCommand, { type: 'text' }>;
        expect(textCmd.type).toBe('text');
        expect(textCmd.text).toBe('World');
    });
});