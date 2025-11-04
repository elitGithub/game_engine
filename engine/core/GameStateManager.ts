/**
 * GameStateManager - Manages game states and transitions using a stack.
 */
import type {StateData} from '@engine/types';
import {GameState} from './GameState';
import type {EngineInputEvent} from './InputEvents';

export class GameStateManager {
    public states: Map<string, GameState>;
    private stateStack: GameState[];

    constructor() {
        this.states = new Map();
        this.stateStack = [];
    }

    register(name: string, state: GameState): void {
        this.states.set(name, state);
        console.log(`[StateManager] Registered state: ${name}`);
    }

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

    popState(): void {
        if (this.stateStack.length === 0) return;

        const removedState = this.stateStack.pop()!;
        removedState.exit();

        const newState = this.getCurrentState();
        if (newState) {
            newState.resume();
        }
    }

    changeState(stateName: string, data: StateData = {}): void {
        while (this.stateStack.length > 0) {
            this.stateStack.pop()!.exit();
        }

        this.pushState(stateName, data);
    }

    update(deltaTime: number): void {
        const currentState = this.getCurrentState();
        if (currentState && currentState.isActive) {
            currentState.update(deltaTime);
        }
    }

    render(renderer: any): void {
        for (const state of this.stateStack) {
            if (state.isActive) {
                state.render(renderer);
            }
        }
    }

    handleEvent(event: EngineInputEvent): void {
        const currentState = this.getCurrentState();
        if (currentState && currentState.isActive) {
            currentState.handleEvent(event);
        }
    }

    getCurrentStateName(): string | null {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1].name
            : null;
    }

    getCurrentState(): GameState | null {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1]
            : null;
    }
}