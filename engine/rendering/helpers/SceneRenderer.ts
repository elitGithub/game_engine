// engine/rendering/helpers/SceneRenderer.ts

import type {RenderCommand, TextStyleData} from '@engine/types/RenderingTypes';
import type { Scene } from '@engine/systems/Scene';
import type { ILogger } from '@engine/interfaces';

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
 * SceneRenderer - Platform-agnostic world-space scene rendering command factory.
 *
 * Generates render commands for layered visual scene elements including sprites,
 * rectangles, and text. Does not manipulate DOM or perform any platform-specific
 * rendering operations.
 *
 * Supports both explicit layer-based scenes and simple background-based scenes
 * with automatic fallback behavior.
 *
 * @example
 * ```typescript
 * const sceneRenderer = new SceneRenderer(logger);
 * const scene: Scene = {
 *   sceneData: {
 *     layers: [
 *       { type: 'sprite', assetId: 'bg_forest', x: 0, y: 0, zIndex: 0 },
 *       { type: 'sprite', assetId: 'char_hero', x: 400, y: 300, width: 100, height: 200, zIndex: 1 }
 *     ]
 *   }
 * };
 * const commands = sceneRenderer.buildSceneCommands(scene);
 * renderer.execute(commands);
 * ```
 */
export class SceneRenderer {
    constructor(private readonly logger: ILogger) {}

    /**
     * Generates all render commands needed to display a complete scene.
     *
     * Processes scene data and creates commands for all visual layers including
     * sprites, rectangles, and text elements. If the scene defines explicit layers,
     * each layer is processed in order. If no layers are defined, falls back to
     * rendering a simple background sprite if available.
     *
     * Validates layer data and logs warnings for incomplete layer definitions.
     *
     * @param scene - Scene object containing layer data or background asset information
     * @returns Array of render commands for all scene visual elements
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
                        this.logger.warn(`[SceneRenderer] 'rect' layer at index ${index} is missing 'width' or 'height'`);
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
                        this.logger.warn(`[SceneRenderer] 'text' layer at index ${index} is missing 'text' or 'style'`);
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