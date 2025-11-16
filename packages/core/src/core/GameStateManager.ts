/**
 * GameStateManager - Manages game states and transitions using a stack.
 *
 * Now injects context into GameState instances for type-safe access
 */
import type {StateData, TypedGameContext} from '@game-engine/core/types';
import type {GameState} from '@game-engine/core/core/GameState';
import type {ILogger} from "@game-engine/core/interfaces";
import {EngineInputEvent} from "@game-engine/core/types/InputEvents";

export class GameStateManager<TGame = Record<string, unknown>> {
    private readonly states: Map<string, GameState<TGame>>;
    private readonly stateStack: GameState<TGame>[];
    private context!: TypedGameContext<TGame>;

    constructor(private readonly logger: ILogger) {
        this.states = new Map();
        this.stateStack = [];
    }

    /**
     * Set the context that will be injected into all states
     * Called by Engine during initialization
     * @internal
     */
    setContext(context: TypedGameContext<TGame>): void {
        this.context = context;
    }

    register(name: string, state: GameState<TGame>): void {
        this.states.set(name, state);

        // Inject context if available
        if (this.context) {
            state.setContext(this.context);
        }

        this.logger.log(`[StateManager] Registered state: ${name}`);
    }

    pushState(stateName: string, data: StateData = {}): void {
        if (!this.states.has(stateName)) {
            this.logger.error(`[StateManager] State '${stateName}' not found!`);
            return;
        }

        const currentState = this.getCurrentState();
        if (currentState) {
            currentState.pause();
        }

        const newState = this.states.get(stateName)!;

        // Ensure context is injected
        if (this.context && !newState.hasContext()) {
            newState.setContext(this.context);
        }

        newState.enter(data);
        this.stateStack.push(newState);
    }

    popState(): void {
        const removedState = this.stateStack.pop();
        if (!removedState) return;

        removedState.exit();

        const newState = this.getCurrentState();
        if (newState) {
            newState.resume();
        }
    }

    changeState(stateName: string, data: StateData = {}): void {
        while (this.stateStack.length > 0) {
            const state = this.stateStack.pop();
            if (state) state.exit();
        }

        this.pushState(stateName, data);
    }

    update(deltaTime: number): void {
        const currentState = this.getCurrentState();
        if (currentState && currentState.isActive) {
            currentState.update(deltaTime);
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

    getCurrentState(): GameState<TGame> | null {
        return this.stateStack.length > 0
            ? this.stateStack[this.stateStack.length - 1]
            : null;
    }

    getStateStack(): readonly GameState<TGame>[] {
        return this.stateStack;
    }

    getStates(): ReadonlyMap<string, GameState<TGame>> {
        return this.states;
    }

    dispose(): void {
        while (this.stateStack.length > 0) {
            this.popState();
        }
        this.states.clear();
    }
}
