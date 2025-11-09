// engine/systems/SceneManager.ts
import type { TypedGameContext } from '@engine/types';
import { Scene } from './Scene';
import type { EventBus } from '../core/EventBus';
import {ScenesDataMap, SceneData, SceneChoice} from "@engine/types/EngineEventMap";

type SceneFactory<TGame> = (id: string, type: string, data: SceneData) => Scene<TGame>;

export class SceneManager<TGame = Record<string, unknown>> {
    private eventBus: EventBus;
    private scenes: Map<string, Scene<TGame>>;
    private currentScene: Scene<TGame> | null;
    private history: string[];
    private sceneFactories: Map<string, SceneFactory<TGame>>;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
        this.scenes = new Map();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories = new Map();

        this.registerSceneFactory('default', (id, type, data) => new Scene(id, type, data));

        // --- FIX: Register 'story' type as an alias for 'default' ---
        // This will fix the test failures where 'story' was expected.
        this.registerSceneFactory('story', (id, type, data) => new Scene(id, type, data));
    }

    registerSceneFactory(type: string, factory: SceneFactory<TGame>): void {
        this.sceneFactories.set(type, factory);
    }

    loadScenes(scenesData: ScenesDataMap): void {
        for (const [id, sceneData] of Object.entries(scenesData)) {
            // --- FIX: Default to 'story' as seen in the code ---
            const type = sceneData.sceneType || 'story';
            const factory = this.sceneFactories.get(type) || this.sceneFactories.get('default')!;
            const scene = factory(id, type, sceneData);
            this.scenes.set(id, scene);
        }
    }

    getScene(sceneId: string): Scene<TGame> | null {
        return this.scenes.get(sceneId) || null;
    }

    // --- FIX: Added 'isNavigatingBack' parameter ---
    goToScene(sceneId: string, context: TypedGameContext<TGame>, isNavigatingBack: boolean = false): boolean {
        const scene = this.getScene(sceneId);

        if (!scene) {
            console.error(`[SceneManager] Scene '${sceneId}' not found`);
            return false;
        }

        if (this.currentScene) {
            this.currentScene.onExit(context);
            // --- FIX: Only add to history on forward navigation ---
            if (!isNavigatingBack) {
                this.history.push(this.currentScene.sceneId);
            }
        }

        this.currentScene = scene;
        scene.onEnter(context);

        this.eventBus.emit('scene.changed', {
            sceneId: scene.sceneId,
            // --- FIX: Use the actual determined type ---
            type: scene.sceneType,
            previousScene: this.history[this.history.length - 1] || null
        });

        return true;
    }

    goBack(context: TypedGameContext<TGame>): boolean {
        if (this.history.length === 0) return false;
        const previousSceneId = this.history.pop()!;
        // --- FIX: Pass 'true' for isNavigatingBack ---
        return this.goToScene(previousSceneId, context, true);
    }

    getCurrentScene(): Scene<TGame> | null {
        return this.currentScene;
    }

    getCurrentChoices(context: TypedGameContext<TGame>): SceneChoice[] {
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