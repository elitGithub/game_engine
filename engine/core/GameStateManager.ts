/**
 * GameStateManager - Manages game states and transitions
 */
import type { StateData } from '@types/index';
import { GameState } from './GameState';

export class GameStateManager {
    private states: Map<string, GameState>;
    private currentState: GameState | null;
    private pendingTransition: string | null;

    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.pendingTransition = null;
    }

    /**
     * Register a state so it can be used
     */
    register(name: string, state: GameState): void {
        this.states.set(name, state);
        console.log(`[StateManager] Registered state: ${name}`);
    }

    /**
     * Switch to a different state
     */
    changeState(stateName: string, data: StateData = {}): void {
        if (!this.states.has(stateName)) {
            console.error(`[StateManager] State '${stateName}' not found!`);
            return;
        }

        // Exit current state
        if (this.currentState) {
            this.currentState.exit();
        }

        // Enter new state
        this.currentState = this.states.get(stateName)!;
        this.currentState.enter(data);
    }

    /**
     * Update the current state
     */
    update(deltaTime: number): void {
        if (this.currentState && this.currentState.isActive) {
            this.currentState.update(deltaTime);
        }
    }

    /**
     * Render the current state
     */
    render(renderer: any): void {
        if (this.currentState && this.currentState.isActive) {
            this.currentState.render(renderer);
        }
    }

    /**
     * Pass input to the current state
     */
    handleInput(input: string): void {
        if (this.currentState && this.currentState.isActive) {
            this.currentState.handleInput(input);
        }
    }

    /**
     * Get the current state name
     */
    getCurrentStateName(): string | null {
        return this.currentState ? this.currentState.name : null;
    }
}
