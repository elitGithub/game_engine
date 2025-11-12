// engine/systems/SceneManager.ts
import type { GameContext } from '@engine/types';
import { Scene } from './Scene';
import type { EventBus } from '../core/EventBus';
import {ScenesDataMap, SceneData, SceneChoice} from "@engine/types/EngineEventMap";
import {ILogger} from "@engine/interfaces";

type SceneFactory = (id: string, type: string, data: SceneData) => Scene;

/**
 * SceneManager - Game-agnostic scene management
 *
 * "Step 1" library component: Provides the mechanism, not the policy.
 * The developer must explicitly register all scene factories via registerSceneFactory().
 *
 * No auto-registration, no defaults, no opinions about scene types.
 */
export class SceneManager {
    private scenes: Map<string, Scene>;
    private currentScene: Scene | null;
    private history: string[];
    private sceneFactories: Map<string, SceneFactory>;

    constructor(private eventBus: EventBus, private logger: ILogger) {
        this.scenes = new Map();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories = new Map();
    }

    /**
     * Register a factory function for creating scenes of a specific type.
     * Must be called before loading scenes that use this type.
     *
     * @param type - The scene type identifier (e.g., 'visual-novel', 'combat')
     * @param factory - Factory function that creates a Scene instance from scene data
     */
    registerSceneFactory(type: string, factory: SceneFactory): void {
        this.sceneFactories.set(type, factory);
    }

    /**
     * Load multiple scenes from a scene data map.
     * Each scene's factory must be registered via registerSceneFactory() first.
     *
     * @param scenesData - Map of scene IDs to scene data objects
     * @throws Error if a scene doesn't specify a sceneType
     * @throws Error if no factory is registered for a scene's type
     */
    loadScenes(scenesData: ScenesDataMap): void {
        for (const [id, sceneData] of Object.entries(scenesData)) {
            const type = sceneData.sceneType;
            if (!type) {
                throw new Error(`[SceneManager] Scene '${id}' does not specify a 'sceneType'.`);
            }
            const factory = this.sceneFactories.get(type);
            if (!factory) {
                throw new Error(
                    `[SceneManager] No scene factory registered for type '${type}' (used by scene '${id}'). ` +
                    `Call registerSceneFactory('${type}', factory) before loading scenes.`
                );
            }
            const scene = factory(id, type, sceneData);
            this.scenes.set(id, scene);
        }
    }

    /**
     * Get a loaded scene by its ID.
     *
     * @param sceneId - Unique identifier of the scene
     * @returns The Scene instance, or null if not found
     */
    getScene(sceneId: string): Scene | null {
        return this.scenes.get(sceneId) || null;
    }

    /**
     * Navigate to a different scene.
     * Calls onExit() on the current scene and onEnter() on the new scene.
     * Adds current scene to history stack unless isNavigatingBack is true.
     * Emits 'scene.changed' event on success.
     *
     * @param sceneId - ID of the scene to navigate to
     * @param context - Game context to pass to scene lifecycle methods
     * @param isNavigatingBack - If true, does not add current scene to history (default: false)
     * @returns True if navigation succeeded, false if scene not found
     */
    goToScene(sceneId: string, context: GameContext, isNavigatingBack: boolean = false): boolean {
        const scene = this.getScene(sceneId);

        if (!scene) {
            this.logger.error(`[SceneManager] Scene '${sceneId}' not found`);
            return false;
        }

        if (this.currentScene) {
            this.currentScene.onExit(context);
            if (!isNavigatingBack) {
                this.history.push(this.currentScene.sceneId);
            }
        }

        this.currentScene = scene;
        scene.onEnter(context);

        this.eventBus.emit('scene.changed', {
            sceneId: scene.sceneId,
            type: scene.sceneType,
            previousScene: this.history[this.history.length - 1] || null
        });

        return true;
    }

    /**
     * Navigate back to the previous scene in the history stack.
     * Does nothing if history is empty.
     *
     * @param context - Game context to pass to scene lifecycle methods
     * @returns True if navigation succeeded, false if history was empty
     */
    goBack(context: GameContext): boolean {
        if (this.history.length === 0) return false;
        const previousSceneId = this.history.pop()!;
        return this.goToScene(previousSceneId, context, true);
    }

    /**
     * Get the currently active scene.
     *
     * @returns The current Scene instance, or null if no scene is active
     */
    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    /**
     * Get the available choices for the current scene.
     * Delegates to the current scene's getChoices() method.
     *
     * @param context - Game context to pass to the scene
     * @returns Array of available choices, or empty array if no scene is active
     */
    getCurrentChoices(context: GameContext): SceneChoice[] {
        if (!this.currentScene) return [];
        return this.currentScene.getChoices(context);
    }

    /**
     * Clear the scene navigation history.
     * Prevents goBack() from navigating to previous scenes.
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Clean up and release all scene resources.
     * Clears all scenes, history, and factory registrations.
     * Call this when shutting down the scene system.
     */
    dispose(): void {
        this.scenes.clear();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories.clear();
    }
}