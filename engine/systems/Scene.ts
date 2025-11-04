/**
 * Scene - Base class for all game scenes
 */
import type { SceneData, SceneChoice, GameContext } from '@types/index';

export class Scene {
    public id: string;
    public type: string;
    public data: SceneData;
    public requirements: SceneData['requirements'];
    public effects: SceneData['effects'];

    constructor(id: string, type: string, data: SceneData = {}) {
        this.id = id;
        this.type = type;
        this.data = data;
        this.requirements = data.requirements || {};
        this.effects = data.effects || {};
    }


    /**
     * Called when scene is entered
     */
    onEnter(context: GameContext): void {
        // Override in game systems if needed
    }

    /**
     * Called when scene is exited
     */
    onExit(context: GameContext): void {
        // Override in game systems if needed
    }

    /**
     * Get scene text/description
     */
    getText(): string {
        return this.data?.text || '';
    }

    /**
     * Get available choices/exits from this scene
     */
    getChoices(context: GameContext): SceneChoice[] {
        return this.data?.choices || [];
    }

    canExit() {
        return true;
    }

    canEnter() {
        return true;
    }
}
