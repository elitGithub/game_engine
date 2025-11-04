// engine/systems/SceneManager.ts
import type { ScenesDataMap, GameContext } from '@engine/types';
import { Scene } from './Scene';
import type { EventBus } from '../core/EventBus';

type SceneFactory = (id: string, type: string, data: any) => Scene;

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

        this.registerSceneFactory('default', (id, type, data) => new Scene(id, type, data));
    }

    registerSceneFactory(type: string, factory: SceneFactory): void {
        this.sceneFactories.set(type, factory);
    }

    loadScenes(scenesData: ScenesDataMap): void {
        for (const [id, sceneData] of Object.entries(scenesData)) {
            const type = sceneData.type || 'story';
            const factory = this.sceneFactories.get(type) || this.sceneFactories.get('default')!;
            const scene = factory(id, type, sceneData);
            this.scenes.set(id, scene);
        }
    }

    getScene(sceneId: string): Scene | null {
        return this.scenes.get(sceneId) || null;
    }

    goToScene(sceneId: string, context: GameContext<any>): boolean {
        const scene = this.getScene(sceneId);

        if (!scene) {
            console.error(`[SceneManager] Scene '${sceneId}' not found`);
            return false;
        }

        if (this.currentScene) {
            this.currentScene.onExit(context);
            this.history.push(this.currentScene.sceneId);
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

    goBack(context: GameContext<any>): boolean {
        if (this.history.length === 0) return false;
        const previousSceneId = this.history.pop()!;
        return this.goToScene(previousSceneId, context);
    }

    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    getCurrentChoices(context: GameContext<any>): any[] {
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