/**
 * GameState - Base class for all game states
 *
 * Supports generic game state typing for full autocomplete in game layer.
 *
 * Example:
 * ```ts
 * interface MyGame { player: Player; }
 * class MenuState extends GameState<MyGame> {
 *   enter() {
 *     this.context.game.player.name; // Type-safe!
 *   }
 * }
 * ```
 */
import type {StateData, TypedGameContext} from '@game-engine/core/types';
import type {EngineInputEvent} from '@game-engine/core/types/InputEvents';
import type {ILogger} from "@game-engine/core/interfaces";

export abstract class GameState<TGame = Record<string, unknown>> {
    private _isActive: boolean = false;
    protected context!: TypedGameContext<TGame>;

    constructor(public readonly name: string, private readonly logger: ILogger) {
    }

    public get isActive(): boolean {
        return this._isActive;
    }


    /**
     * Set the context (called by StateManager)
     * @internal
     */
    setContext(context: TypedGameContext<TGame>): void {
        this.context = context;
    }

    /**
     * Check if context has been injected
     * @internal
     */
    hasContext(): boolean {
        return this.context !== undefined;
    }

    /**
     * Called by the GameStateManager when this state is first pushed onto the stack.
     * Override this to set up your state (e.g., load UI, start music).
     *
     * You can now access: this.context.game.X with full type safety!
     */
    enter(_data: StateData = {}): void {
        this._isActive = true;
        this.logger.log(`[State] Entering: ${this.name}`);
    }

    /**
     * Called by the GameStateManager when this state is finally popped from the stack.
     * Override this to clean up your state (e.g., destroy UI, stop sounds).
     */
    exit(): void {
        this._isActive = false;
        this.logger.log(`[State] Exiting: ${this.name}`);
    }

    /**
     * HOOK: Called by the GameStateManager when a new state is pushed on top of this one.
     * Override this in your game state (e.g., GameplayState) to add logic
     * for pausing music, stopping animations, or showing a "Paused" overlay.
     */
    pause(): void {
        this.logger.log(`[State] Pausing: ${this.name}`);
    }

    /**
     * HOOK: Called by the GameStateManager when the state on top of this one is popped off.
     * Override this in your game state (e.g., GameplayState) to add logic
     * for resuming music, restarting animations, or hiding a "Paused" overlay.
     */
    resume(): void {
        this.logger.log(`[State] Resuming: ${this.name}`);
    }

    /**
     * Called by the GameStateManager every frame if this state is on top of the stack.
     * Override this to run your main game logic (e.g., player movement, physics).
     */
    update(_deltaTime: number): void {
        // Override in subclasses
    }

    /**
     * Called by the GameStateManager if this state is on top of the stack.
     * Override this to handle all keyboard, mouse, touch, and gamepad events.
     */
    handleEvent(_event: EngineInputEvent): void {
        // Override in subclasses
    }
}
