// engine/rendering/helpers/SceneRenderer.ts
import type { RenderCommand } from '@engine/types/RenderingTypes';
import type { GameContext } from '@engine/types';
import type { Scene } from '@engine/systems/Scene';

/**
 * Defines the contract for a renderable "actor" in the world.
 * Your game's Player, NPC, and Item classes should satisfy this
 * interface to be rendered by the SceneRenderer.
 */
export interface WorldEntity {
    /** A unique ID for the render command (e.g., 'player', 'npc_guard_1') */
    id: string;
    /** The asset ID to be fetched from the AssetManager */
    assetId: string;
    /** The x-position in world-space */
    x: number;
    /** The y-position in world-space */
    y: number;
    /** Optional width for the sprite */
    width?: number;
    /** Optional height for the sprite */
    height?: number;
    /** Optional z-index override. If not provided, zIndex will be based on y-position. */
    zIndex?: number;
}

/**
 * Defines the contract for a static scene layer.
 * To use this, your `scene.sceneData.layers` property
 * should be an array of objects matching this interface.
 */
export interface SceneLayer {
    /** A unique ID for the render command (e.g., 'bg', 'fg_trees') */
    id: string;
    /** The asset ID to be fetched from the AssetManager */
    assetId: string;
    /** The x-position of the layer (for parallax, etc.) */
    x: number;
    /** The y-position of the layer */
    y: number;
    /** zIndex determines render order (e.g., -100 for sky, 1000 for foreground) */
    zIndex: number;
    width?: number;
    height?: number;
    /** Optional image fit property */
    fit?: 'cover' | 'contain' | 'fill';
}

/**
 * "Smart Helper" for World-Space rendering.
 *
 * This class is a utility used by your GameState. It translates
 * high-level game objects (Scenes, Actors) into low-level
 * RenderCommands for the RenderManager to process.
 */
export class SceneRenderer {

    constructor() {
        // This helper is stateless.
    }

    /**
     * Generates RenderCommands for the static scene environment (backgrounds, etc.).
     *
     * This method looks for scene data in two ways:
     * 1. A simple `scene.sceneData.backgroundAsset` string.
     * 2. A complex `scene.sceneData.layers` array of SceneLayer objects.
     */
    buildSceneCommands(scene: Scene, _context: GameContext): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const layers = scene.sceneData.layers as SceneLayer[] | undefined;

        if (layers && Array.isArray(layers)) {
            // --- Complex Mode: Process layers array ---
            for (const layer of layers) {
                commands.push({
                    type: 'image',
                    id: layer.id,
                    assetId: layer.assetId,
                    x: layer.x || 0,
                    y: layer.y || 0,
                    width: layer.width,
                    height: layer.height,
                    fit: layer.fit,
                    zIndex: layer.zIndex // zIndex is required for layers
                });
            }
        } else if (scene.sceneData.backgroundAsset) {
            // --- Simple Mode: Process single background asset ---
            commands.push({
                type: 'image',
                id: `${scene.sceneId}_background`,
                assetId: scene.sceneData.backgroundAsset as string,
                x: 0,
                y: 0,
                fit: 'cover', // Default to 'cover' for a simple background
                zIndex: -100  // Default to a deep z-index
            });
        }

        return commands;
    }

    /**
     * Generates RenderCommands for dynamic actors in the scene (Player, NPCs).
     *
     * This method implements 2.5D Y-axis sorting by default, using the
     * actor's `y` position as its `zIndex`.
     */
    buildActorCommands(actors: WorldEntity[], _context: GameContext): RenderCommand[] {
        const commands: RenderCommand[] = [];

        for (const actor of actors) {
            // Dynamic z-index:
            // Use an explicit zIndex if provided.
            // Otherwise, default to the actor's rounded y-position.
            // This makes actors in front (higher y) render on top.
            const zIndex = actor.zIndex ?? Math.round(actor.y);

            commands.push({
                type: 'sprite',
                id: actor.id,
                assetId: actor.assetId,
                x: Math.round(actor.x),
                y: Math.round(actor.y),
                width: actor.width,
                height: actor.height,
                zIndex: zIndex
            });
        }

        return commands;
    }
}