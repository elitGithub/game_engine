/**
 * Scene - Base class for all game scenes
 *
 * Fully game-agnostic. Does not know about your game state type.
 * When implementing game-specific scenes, cast the context to TypedGameContext<YourGameState>.
 */
import type {GameContext} from '@engine/types';
import type {SceneChoice, SceneData} from "@engine/types/EngineEventMap";

export class Scene {

    constructor(public readonly sceneId: string, public readonly sceneType: string, public readonly sceneData: SceneData = {}) {
    }

    /**
     * Called when scene is entered
     */
    onEnter(_context: GameContext): void {
        // Override in game systems if needed
    }

    /**
     * Called when scene is exited
     */
    onExit(_context: GameContext): void {
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
    getChoices(_context: GameContext): SceneChoice[] {
        return this.sceneData?.choices || [];
    }

    canExit(): boolean {
        return true;
    }

    canEnter(): boolean {
        return true;
    }
}
