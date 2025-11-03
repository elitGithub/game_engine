/**
 * GameStateManager - Manages game states and transitions using a stack.
 */
import type {StateData} from '@types/index';
import {GameState} from './GameState';
import type {EngineInputEvent} from './Inputevents';

export class GameStateManager {
    public states: Map<string, GameState>;
    private stateStack: GameState[];

    constructor() {
        this.states = new Map();
        this.stateStack = [];
    }

    /**
     * Register a state so it can be used
     */
    register(name: string, state: GameState): void {
        this.states.set(name, state);
        console.log(`[StateManager] Registered state: ${name}`);
    }

    /**
     * Pushes a new state onto the stack (e.g., opening a pause menu).
     * The current top state will be paused.
     */
    pushState(stateName: string, data: StateData = {}): void {
        if (!this.states.has(stateName)) {
            console.error(`[StateManager] State '${stateName}' not found!`);
            return;
        }

        const currentState = this.getCurrentState();
        if (currentState) {
            currentState.pause();
        }

        const newState = this.states.get(stateName)!;
        newState.enter(data);
        this.stateStack.push(newState);
    }

    /**
     * Pops the top state from the stack (e.g., closing a pause menu).
     * The state below it will be resumed.
     */
    popState(): void {
        if (this.stateStack.length === 0) return;

        const removedState = this.stateStack.pop()!;
        removedState.exit();

        const newState = this.getCurrentState();
        if (newState) {
            newState.resume();
        }
    }

    /**
     * Clears the entire stack and pushes a new state (e.g., main menu -> gameplay).
     */
    changeState(stateName: string, data: StateData = {}): void {
        // Exit all current states
        while (this.stateStack.length > 0) {
            this.stateStack.pop()!.exit();
        }

        // Push the new state
        this.pushState(stateName, data);
    }

    /**
     * Update the top-most state
     */
    update(deltaTime: number): void {
        const currentState = this.getCurrentState();
        if (currentState && currentState.isActive) {
            currentState.update(deltaTime);
        }
    }

    /**
     * Render all states in the stack, from bottom to top.
     */
    render(renderer: any): void {
        for (const state of this.stateStack) {
            if (state.isActive) {
                state.render(renderer);
            }
        }
    }

    /**
     * Pass rich event input to the top-most state
     */
    handleEvent(event: EngineInputEvent): void {
        const currentState = this.getCurrentState();
        if (currentState && currentState.isActive) {
            currentState.handleEvent(event);
        }
    }

    /**
     * Get the current state name
     */
    getCurrentStateName(): string | null {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1].name
            : null;
    }

    /**
     * Get the current state instance (needed by InputManager)
     */
    getCurrentState(): GameState | null {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1]
            : null;
    }
}