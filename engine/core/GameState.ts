/**
 * GameState - Base class for all game states
 *
 * Now supports generic game state typing for full autocomplete
 */
import type { StateData, GameContext } from '@engine/types';
import type { EngineInputEvent } from './InputEvents';

export abstract class GameState<TGame = Record<string, unknown>> {
    public name: string;
    public isActive: boolean;
    protected context!: GameContext<TGame>;

    constructor(name: string) {
        this.name = name;
        this.isActive = false;
    }

    /**
     * Set the context (called by StateManager)
     * @internal
     */
    setContext(context: GameContext<TGame>): void {
        this.context = context;
    }

    /**
     * Called by the GameStateManager when this state is first pushed onto the stack.
     * Override this to set up your state (e.g., load UI, start music).
     *
     * You can now access: this.context.game.X with full type safety!
     */
    enter(data: StateData = {}): void {
        this.isActive = true;
        console.log(`[State] Entering: ${this.name}`);
    }

    /**
     * Called by the GameStateManager when this state is finally popped from the stack.
     * Override this to clean up your state (e.g., destroy UI, stop sounds).
     */
    exit(): void {
        this.isActive = false;
        console.log(`[State] Exiting: ${this.name}`);
    }

    /**
     * HOOK: Called by the GameStateManager when a new state is pushed on top of this one.
     * Override this in your game state (e.g., GameplayState) to add logic
     * for pausing music, stopping animations, or showing a "Paused" overlay.
     */
    pause(): void {
        console.log(`[State] Pausing: ${this.name}`);
    }

    /**
     * HOOK: Called by the GameStateManager when the state on top of this one is popped off.
     * Override this in your game state (e.g., GameplayState) to add logic
     * for resuming music, restarting animations, or hiding a "Paused" overlay.
     */
    resume(): void {
        console.log(`[State] Resuming: ${this.name}`);
    }

    /**
     * Called by the GameStateManager every frame if this state is on top of the stack.
     * Override this to run your main game logic (e.g., player movement, physics).
     */
    update(deltaTime: number): void {
        // Override in subclasses
    }

    /**
     * Called by the GameStateManager every frame for *all* active states in the stack.
     * Override this to render your scene. This runs even if not on top,
     * allowing for transparent states (e.g., a HUD or a transparent pause menu).
     */
    render(renderer: unknown): void {
        // Override in subclasses
    }

    /**
     * Called by the GameStateManager if this state is on top of the stack.
     * Override this to handle all keyboard, mouse, touch, and gamepad events.
     */
    handleEvent(event: EngineInputEvent): void {
        // Override in subclasses
    }
}
