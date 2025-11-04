/**
 * Scene - Base class for all game scenes
 */
import type {GameContext, SceneChoice, SceneData} from '@engine/types';

export class Scene {

    constructor(public sceneId: string, public sceneType: string, public sceneData: SceneData = {}) {
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
        return this.sceneData?.text || '';
    }

    /**
     * Get available choices/exits from this scene
     */
    getChoices(context: GameContext): SceneChoice[] {
        return this.sceneData?.choices || [];
    }

    canExit() {
        return true;
    }

    canEnter() {
        return true;
    }
}
