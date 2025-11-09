/**
 * Scene - Base class for all game scenes
 */
import type {TypedGameContext} from '@engine/types';
import {SceneChoice, SceneData} from "@engine/types/EngineEventMap";

export class Scene<TGame = Record<string, unknown>> {

    constructor(public sceneId: string, public sceneType: string, public sceneData: SceneData = {}) {
    }

    /**
     * Called when scene is entered
     */
    onEnter(context: TypedGameContext<TGame>): void {
        // Override in game systems if needed
    }

    /**
     * Called when scene is exited
     */
    onExit(context: TypedGameContext<TGame>): void {
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
    getChoices(context: TypedGameContext<TGame>): SceneChoice[] {
        return this.sceneData?.choices || [];
    }

    canExit(): boolean {
        return true;
    }

    canEnter(): boolean {
        return true;
    }
}
