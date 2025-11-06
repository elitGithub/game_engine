// engine/rendering/helpers/SceneRenderer.ts

import type { RenderCommand } from '../../types/RenderingTypes';
import type { Scene } from '../../systems/Scene';

interface SceneLayer {
    type: 'sprite' | 'rect' | 'text';
    assetId?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zIndex?: number;
    [key: string]: unknown;
}

/**
 * SceneRenderer - "Smart Helper" for World-Space rendering.
 *
 * This class provides methods to generate RenderCommands for
 * all layered visual scene elements.
 */
export class SceneRenderer {
    constructor() {}

    /**
     * Generates commands for rendering the entire scene.
     */
    buildSceneCommands(scene: Scene): RenderCommand[] {
        const commands: RenderCommand[] = [];

        // If the scene has explicit layers, render them
        const layers = scene.sceneData.layers as SceneLayer[] | undefined;
        if (layers && Array.isArray(layers)) {
            layers.forEach((layer, index) => {
                if (layer.type === 'sprite' && layer.assetId) {
                    commands.push({
                        type: 'sprite',
                        id: `scene_layer_${index}`,
                        assetId: layer.assetId,
                        x: layer.x || 0,
                        y: layer.y || 0,
                        width: layer.width,
                        height: layer.height,
                        zIndex: layer.zIndex || index
                    });
                }
                // Add more layer types as needed
            });
        }
        // Fallback: simple background if no layers
        else if (scene.sceneData.backgroundAsset) {
            commands.push({
                type: 'sprite',
                id: 'scene_background',
                assetId: scene.sceneData.backgroundAsset as string,
                x: 0,
                y: 0,
                zIndex: 0
            });
        }

        return commands;
    }

    /**
     * Generates commands for hotspots in the scene.
     */
    buildHotspotCommands(scene: Scene): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const hotspots = scene.sceneData.hotspots as Array<{
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            action?: string;
        }> | undefined;

        if (hotspots && Array.isArray(hotspots)) {
            hotspots.forEach((hotspot) => {
                commands.push({
                    type: 'hotspot',
                    id: hotspot.id,
                    action: hotspot.action || hotspot.id,
                    x: hotspot.x,
                    y: hotspot.y,
                    width: hotspot.width,
                    height: hotspot.height,
                    zIndex: 50
                });
            });
        }

        return commands;
    }
}
