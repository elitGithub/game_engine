import { describe, it, expect, beforeEach } from 'vitest';
import { SceneRenderer } from '@engine/rendering/helpers/SceneRenderer';
import { Scene } from '@engine/systems/Scene';
import type { RenderCommand } from '@engine/types/RenderingTypes';

// Mock the Scene class
class MockScene extends Scene {
    constructor(id: string, data: any) {
        super(id, 'mock', data);
    }
}

describe('SceneRenderer', () => {
    let renderer: SceneRenderer;

    beforeEach(() => {
        renderer = new SceneRenderer();
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

    it('should render layers if they exist', () => {
        const scene = new MockScene('scene2', {
            layers: [
                { type: 'sprite', assetId: 'bg', x: 0, y: 0, zIndex: 0 },
                { type: 'sprite', assetId: 'char', x: 100, y: 50, zIndex: 10 },
                { type: 'rect', assetId: 'fog' } // Non-sprite, should be ignored
            ]
        });

        const commands = renderer.buildSceneCommands(scene);

        expect(commands).toHaveLength(2); // Ignores the 'rect' type

        // FIX: Assert types
        const bgCmd = commands[0] as Extract<RenderCommand, { type: 'sprite' }>;
        const charCmd = commands[1] as Extract<RenderCommand, { type: 'sprite' }>;

        expect(bgCmd.assetId).toBe('bg');
        expect(bgCmd.id).toBe('scene_layer_0');
        expect(bgCmd.zIndex).toBe(0);

        expect(charCmd.assetId).toBe('char');
        expect(charCmd.id).toBe('scene_layer_1');
        expect(charCmd.x).toBe(100);
        expect(charCmd.y).toBe(50);
        expect(charCmd.zIndex).toBe(10);
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
});