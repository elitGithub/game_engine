// engine/rendering/helpers/SceneRenderer.ts

import type {RenderCommand, TextStyleData} from '@engine/types/RenderingTypes';
import type { Scene } from '@engine/systems/Scene';

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
                // --- ADD THIS BLOCK ---
                else if (layer.type === 'rect') {
                    if (typeof layer.width !== 'number' || typeof layer.height !== 'number') {
                        console.warn(`[SceneRenderer] 'rect' layer at index ${index} is missing 'width' or 'height'`);
                    } else {
                        commands.push({
                            type: 'rect',
                            id: `scene_layer_${index}`,
                            x: layer.x || 0,
                            y: layer.y || 0,
                            width: layer.width,
                            height: layer.height,
                            fill: layer.fill as string,
                            stroke: layer.stroke as string,
                            zIndex: layer.zIndex || index
                        });
                    }
                }
                // --- AND ADD THIS BLOCK ---
                else if (layer.type === 'text') {
                    if (typeof layer.text !== 'string' || typeof layer.style !== 'object') {
                        console.warn(`[SceneRenderer] 'text' layer at index ${index} is missing 'text' or 'style'`);
                    } else {
                        commands.push({
                            type: 'text',
                            id: `scene_layer_${index}`,
                            text: layer.text,
                            x: layer.x || 0,
                            y: layer.y || 0,
                            style: layer.style as TextStyleData, // Make sure to import TextStyleData
                            zIndex: layer.zIndex || index
                        });
                    }
                }
                // --- END OF ADDED BLOCKS ---
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
}