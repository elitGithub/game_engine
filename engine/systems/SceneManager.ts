/**
 * SceneManager - Manages all game scenes and transitions
 */
import type { ScenesDataMap, GameContext } from '@types/index';
import { Scene } from './Scene';
import { eventBus } from '../core/EventBus';

type SceneFactory = (id: string, type: string, data: any) => Scene;

export class SceneManager {
    private scenes: Map<string, Scene>;
    private currentScene: Scene | null;
    private history: string[];
    private sceneFactories: Map<string, SceneFactory>;

    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
        this.history = [];
        this.sceneFactories = new Map();
        
        // Register default factory
        this.registerSceneFactory('default', (id, type, data) => new Scene(id, type, data));
    }

    /**
     * Register a factory for creating specific scene types
     */
    registerSceneFactory(type: string, factory: SceneFactory): void {
        this.sceneFactories.set(type, factory);
        console.log(`[SceneManager] Registered scene factory: ${type}`);
    }

    /**
     * Load scenes from data object
     */
    loadScenes(scenesData: ScenesDataMap): void {
        console.log('[SceneManager] Loading scenes...');
        
        for (const [id, sceneData] of Object.entries(scenesData)) {
            const type = sceneData.type || 'story';
            const factory = this.sceneFactories.get(type) || this.sceneFactories.get('default')!;
            
            const scene = factory(id, type, sceneData);
            this.scenes.set(id, scene);
        }
        
        console.log(`[SceneManager] Loaded ${this.scenes.size} scenes`);
    }

    /**
     * Get a scene by ID
     */
    getScene(sceneId: string): Scene | null {
        return this.scenes.get(sceneId) || null;
    }

    /**
     * Transition to a different scene
     */
    goToScene(sceneId: string, context: GameContext): boolean {
        const scene = this.getScene(sceneId);
        
        if (!scene) {
            console.error(`[SceneManager] Scene '${sceneId}' not found`);
            return false;
        }

        // Check if player can enter
        if (!scene.canEnter(context)) {
            console.warn(`[SceneManager] Cannot enter scene '${sceneId}' - requirements not met`);
            eventBus.emit('scene.blocked', { sceneId, requirements: scene.requirements });
            return false;
        }

        // Exit current scene
        if (this.currentScene) {
            this.currentScene.onExit(context);
            this.history.push(this.currentScene.id);
        }

        // Enter new scene
        this.currentScene = scene;
        scene.onEnter(context);
        
        // Emit event
        eventBus.emit('scene.changed', { 
            sceneId: scene.id, 
            type: scene.type,
            previousScene: this.history[this.history.length - 1] || null
        });

        return true;
    }

    /**
     * Go back to previous scene
     */
    goBack(context: GameContext): boolean {
        if (this.history.length === 0) {
            console.warn('[SceneManager] No previous scene to go back to');
            return false;
        }

        const previousSceneId = this.history.pop()!;
        return this.goToScene(previousSceneId, context);
    }

    /**
     * Get the current scene
     */
    getCurrentScene(): Scene | null {
        return this.currentScene;
    }

    /**
     * Get available choices from current scene
     */
    getCurrentChoices(context: GameContext): any[] {
        if (!this.currentScene) return [];
        return this.currentScene.getChoices(context);
    }
}
