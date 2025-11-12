/**
 * GameStateManager - Manages game states and transitions using a stack.
 *
 * Now injects context into GameState instances for type-safe access
 */
import type {StateData, TypedGameContext} from '@engine/types';
import {GameState} from './GameState';
import type {EngineInputEvent} from './InputEvents';
import {ILogger} from "@engine/interfaces";

export class GameStateManager<TGame = Record<string, unknown>> {
    public states: Map<string, GameState<TGame>>;
    private stateStack: GameState<TGame>[];
    private context!: TypedGameContext<TGame>;

    constructor(private logger: ILogger) {
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
        if (this.context && !newState['context']) {
            newState.setContext(this.context);
        }

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

    dispose(): void {
        while (this.stateStack.length > 0) {
            this.popState();
        }
        this.states.clear();
    }
}
