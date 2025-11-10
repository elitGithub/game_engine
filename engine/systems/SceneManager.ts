// engine/systems/SceneManager.ts
import type { GameContext } from '@engine/types';
import { Scene } from './Scene';
import type { EventBus } from '../core/EventBus';
import {ScenesDataMap, SceneData, SceneChoice} from "@engine/types/EngineEventMap";

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
    private eventBus: EventBus;
    private scenes: Map<string, Scene>;
    private currentScene: Scene | null;
    private history: string[];
    private sceneFactories: Map<string, SceneFactory>;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this.scenes = new Map();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories = new Map();
    }

    registerSceneFactory(type: string, factory: SceneFactory): void {
        this.sceneFactories.set(type, factory);
    }

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

    getScene(sceneId: string): Scene | null {
        return this.scenes.get(sceneId) || null;
    }

    goToScene(sceneId: string, context: GameContext, isNavigatingBack: boolean = false): boolean {
        const scene = this.getScene(sceneId);

        if (!scene) {
            console.error(`[SceneManager] Scene '${sceneId}' not found`);
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

    goBack(context: GameContext): boolean {
        if (this.history.length === 0) return false;
        const previousSceneId = this.history.pop()!;
        return this.goToScene(previousSceneId, context, true);
    }

    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    getCurrentChoices(context: GameContext): SceneChoice[] {
        if (!this.currentScene) return [];
        return this.currentScene.getChoices(context);
    }

    clearHistory(): void {
        this.history = [];
    }

    dispose(): void {
        this.scenes.clear();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories.clear();
    }
}