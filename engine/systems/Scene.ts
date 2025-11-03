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
     * Check if player can enter this scene
     */
    canEnter(context: GameContext): boolean {
        if (this.requirements?.hasItem) {
            const item = this.requirements.hasItem;
            if (!context.player?.hasItem(item)) {
                return false;
            }
        }

        if (this.requirements?.hasFlag) {
            const flag = this.requirements.hasFlag;
            if (!context.player?.hasFlag(flag)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Called when scene is entered
     */
    onEnter(context: GameContext): void {
        console.log(`[Scene] Entering: ${this.id} (type: ${this.type})`);
        this.applyEffects(context);
    }

    /**
     * Called when scene is exited
     */
    onExit(context: GameContext): void {
        console.log(`[Scene] Exiting: ${this.id}`);
    }

    /**
     * Apply scene effects to game state
     */
    applyEffects(context: GameContext): void {
        if (this.effects?.setFlag) {
            context.player?.addFlag(this.effects.setFlag);
        }

        if (this.effects?.heal) {
            context.player?.heal(this.effects.heal);
        }

        if (this.effects?.damage) {
            context.player?.takeDamage(this.effects.damage);
        }
    }

    /**
     * Get scene text/description
     */
    getText(): string {
        return this.data.text || '';
    }

    /**
     * Get available choices/exits from this scene
     */
    getChoices(context: GameContext): SceneChoice[] {
        return this.data.choices || [];
    }
}
