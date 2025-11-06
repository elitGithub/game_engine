// engine/systems/InputManager.ts
import type { GameStateManager } from '../core/GameStateManager';
import type { EventBus } from '../core/EventBus';
import type {
    EngineInputEvent,
    GamepadButtonEvent,
    GamepadAxisEvent,
    InputAction,
    InputBinding,
    InputCombo
} from '../core/InputEvents';
import {InputMode} from "@engine/types/EngineEventMap";

interface InputState {
    keysDown: Set<string>;
    mouseButtonsDown: Set<number>;
    mousePosition: { x: number; y: number };
    touchPoints: Map<number, { x: number; y: number }>;
    gamepadStates: Map<number, GamepadState>;
}

interface GamepadState {
    buttons: Map<number, { pressed: boolean; value: number }>;
    axes: Map<number, number>;
}

interface BufferedInput {
    input: string;
    timestamp: number;
}

/**
 * InputManager - Platform-agnostic input handling
 *
 * This manager processes engine-agnostic input events and maintains input state.
 * It does NOT depend on any platform-specific APIs (DOM, native, etc.).
 *
 * Platform-specific adapters (e.g., DomInputAdapter) translate raw events
 * into engine events and pass them to this manager via processEvent().
 */
export class InputManager {
    private stateManager: GameStateManager;
    private eventBus: EventBus;

    private state: InputState;
    private enabled: boolean;
    private currentMode: InputMode;

    private actions: Map<string, InputAction>;

    private inputBuffer: BufferedInput[];
    private readonly bufferSize: number;
    private combos: Map<string, InputCombo>;

    private gamepadPollingInterval: number | null;
    private lastGamepadStates: Map<number, GamepadState>;

    constructor(stateManager: GameStateManager, eventBus: EventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;

        this.state = {
            keysDown: new Set(),
            mouseButtonsDown: new Set(),
            mousePosition: { x: 0, y: 0 },
            touchPoints: new Map(),
            gamepadStates: new Map()
        };

        this.enabled = true;
        this.currentMode = 'gameplay';

        this.actions = new Map();
        this.combos = new Map();

        this.inputBuffer = [];
        this.bufferSize = 10;

        this.gamepadPollingInterval = null;
        this.lastGamepadStates = new Map();
    }

    // ============================================================================
    // EVENT PROCESSING (Core adapter interface)
    // ============================================================================

    /**
     * Process an engine-agnostic input event
     * Called by input adapters (DomInputAdapter, GamepadAdapter, etc.)
     */
    public processEvent(event: EngineInputEvent): void {
        if (!this.enabled) return;

        switch (event.type) {
            case 'keydown':
                this.state.keysDown.add(event.key);
                this.addToBuffer(event.key);
                this.dispatchEvent(event, true);
                this.checkActionTriggers('key', event.key, {
                    shift: event.shift,
                    ctrl: event.ctrl,
                    alt: event.alt,
                    meta: event.meta
                });
                break;

            case 'keyup':
                this.state.keysDown.delete(event.key);
                this.dispatchEvent(event, false);
                break;

            case 'mousedown':
                this.state.mouseButtonsDown.add(event.button);
                this.addToBuffer(`mouse${event.button}`);
                this.dispatchEvent(event, true);
                this.checkActionTriggers('mouse', event.button, {
                    shift: event.shift,
                    ctrl: event.ctrl,
                    alt: event.alt,
                    meta: event.meta
                });
                break;

            case 'mouseup':
                this.state.mouseButtonsDown.delete(event.button);
                this.dispatchEvent(event, false);
                break;

            case 'mousemove':
                this.state.mousePosition = { x: event.x, y: event.y };
                this.dispatchEvent(event, false);
                break;

            case 'wheel':
                this.dispatchEvent(event, false);
                break;

            case 'click':
                // Check for action triggers from DOM elements
                const target = event.target as HTMLElement | null;
                if (target?.dataset?.action) {
                    this.eventBus.emit('input.action', { action: target.dataset.action });
                }
                this.dispatchEvent(event, false);
                break;

            case 'touchstart':
                event.touches.forEach(touch => {
                    this.state.touchPoints.set(touch.id, { x: touch.x, y: touch.y });
                });
                this.addToBuffer(`touch${event.touches.length}`);
                this.dispatchEvent(event, true);
                break;

            case 'touchmove':
                event.touches.forEach(touch => {
                    this.state.touchPoints.set(touch.id, { x: touch.x, y: touch.y });
                });
                this.dispatchEvent(event, false);
                break;

            case 'touchend':
                event.touches.forEach(touch => {
                    this.state.touchPoints.delete(touch.id);
                });
                this.dispatchEvent(event, false);
                break;

            case 'gamepadbutton':
                if (event.pressed) {
                    this.addToBuffer(`gamepad${event.gamepadIndex}_button${event.button}`);
                    this.checkActionTriggers('gamepad', event.button);
                }
                this.dispatchEvent(event, event.pressed);
                break;

            case 'gamepadaxis':
                this.dispatchEvent(event, false);
                break;
        }
    }

    // ============================================================================
    // GAMEPAD POLLING (Still uses browser API - could be adapted)
    // ============================================================================

    enableGamepadPolling(): void {
        if (this.gamepadPollingInterval !== null) return;

        this.gamepadPollingInterval = window.setInterval(() => {
            this.pollGamepads();
        }, 16);
    }

    disableGamepadPolling(): void {
        if (this.gamepadPollingInterval === null) return;

        clearInterval(this.gamepadPollingInterval);
        this.gamepadPollingInterval = null;
    }

    private pollGamepads(): void {
        if (!this.enabled) return;

        const gamepads = navigator.getGamepads();

        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) continue;

            const lastState = this.lastGamepadStates.get(i);
            const currentState: GamepadState = {
                buttons: new Map(),
                axes: new Map()
            };

            gamepad.buttons.forEach((button, index) => {
                currentState.buttons.set(index, { pressed: button.pressed, value: button.value });

                const wasPressed = lastState?.buttons.get(index)?.pressed || false;

                if (button.pressed && !wasPressed) {
                    const event: GamepadButtonEvent = {
                        type: 'gamepadbutton',
                        timestamp: Date.now(),
                        gamepadIndex: i,
                        button: index,
                        pressed: true,
                        value: button.value
                    };

                    this.processEvent(event);
                }
            });

            gamepad.axes.forEach((value, index) => {
                currentState.axes.set(index, value);

                const lastValue = lastState?.axes.get(index) || 0;

                if (Math.abs(value - lastValue) > 0.1) {
                    const event: GamepadAxisEvent = {
                        type: 'gamepadaxis',
                        timestamp: Date.now(),
                        gamepadIndex: i,
                        axis: index,
                        value
                    };

                    this.processEvent(event);
                }
            });

            this.lastGamepadStates.set(i, currentState);
            this.state.gamepadStates.set(i, currentState);
        }
    }

    dispose(): void {
        this.disableGamepadPolling();
    }

    // ============================================================================
    // EVENT DISPATCHING
    // ============================================================================

    private dispatchEvent(event: EngineInputEvent, checkCombos: boolean): void {
        this.stateManager.handleEvent(event);
        if (checkCombos) {
            this.checkCombos();
        }
        this.eventBus.emit(`input.${event.type}`, event);
    }

    // ============================================================================
    // INPUT STATE QUERIES
    // ============================================================================

    isKeyDown(key: string): boolean {
        return this.state.keysDown.has(key);
    }

    isMouseButtonDown(button: number): boolean {
        return this.state.mouseButtonsDown.has(button);
    }

    getMousePosition(): { x: number; y: number } {
        return { ...this.state.mousePosition };
    }

    getTouchPoints(): Array<{ id: number; x: number; y: number }> {
        return Array.from(this.state.touchPoints.entries()).map(([id, pos]) => ({
            id,
            ...pos
        }));
    }

    isGamepadButtonPressed(gamepadIndex: number, button: number): boolean {
        return this.state.gamepadStates.get(gamepadIndex)?.buttons.get(button)?.pressed || false;
    }

    getGamepadAxis(gamepadIndex: number, axis: number): number {
        return this.state.gamepadStates.get(gamepadIndex)?.axes.get(axis) || 0;
    }

    // ============================================================================
    // INPUT ACTIONS (REBINDING)
    // ============================================================================

    registerAction(name: string, bindings: InputBinding[]): void {
        this.actions.set(name, { name, bindings });
    }

    isActionTriggered(actionName: string): boolean {
        const action = this.actions.get(actionName);
        if (!action) return false;

        return action.bindings.some(binding => {
            if (binding.type === 'key') {
                const keyDown = this.isKeyDown(binding.input as string);
                if (!keyDown) return false;

                if (binding.modifiers) {
                    if (binding.modifiers.shift && !this.isKeyDown('Shift')) return false;
                    if (binding.modifiers.ctrl && !this.isKeyDown('Control')) return false;
                    if (binding.modifiers.alt && !this.isKeyDown('Alt')) return false;
                    if (binding.modifiers.meta && !this.isKeyDown('Meta')) return false;
                }

                return true;
            } else if (binding.type === 'mouse') {
                return this.isMouseButtonDown(binding.input as number);
            } else if (binding.type === 'gamepad') {
                return this.isGamepadButtonPressed(0, binding.input as number);
            }

            return false;
        });
    }

    private checkActionTriggers(type: string, input: string | number, modifiers?: any): void {
        this.actions.forEach((action, name) => {
            const triggered = action.bindings.some(binding => {
                if (binding.type !== type) return false;
                if (binding.input !== input) return false;

                if (type === 'key' && binding.modifiers && modifiers) {
                    if (binding.modifiers.shift !== modifiers.shift) return false;
                    if (binding.modifiers.ctrl !== modifiers.ctrl) return false;
                    if (binding.modifiers.alt !== modifiers.alt) return false;
                    if (binding.modifiers.meta !== modifiers.meta) return false;
                }

                return true;
            });

            if (triggered) {
                this.eventBus.emit('input.action', { action: name });
            }
        });
    }

    // ============================================================================
    // INPUT BUFFERING AND COMBOS
    // ============================================================================

    private addToBuffer(input: string): void {
        this.inputBuffer.push({
            input,
            timestamp: Date.now()
        });

        if (this.inputBuffer.length > this.bufferSize) {
            this.inputBuffer.shift();
        }
    }

    registerCombo(name: string, inputs: string[], timeWindow: number = 1000): void {
        this.combos.set(name, { inputs, timeWindow });
    }

    private checkCombos(): void {
        this.combos.forEach((combo, name) => {
            if (this.isComboTriggered(combo)) {
                this.eventBus.emit('input.combo', { combo: name });
            }
        });
    }

    private isComboTriggered(combo: InputCombo): boolean {
        if (this.inputBuffer.length < combo.inputs.length) return false;

        const recent = this.inputBuffer.slice(-combo.inputs.length);
        const now = Date.now();

        return combo.inputs.every((input, i) => {
            const buffered = recent[i];
            return buffered.input === input && (now - buffered.timestamp) <= combo.timeWindow;
        });
    }

    getInputBuffer(): string[] {
        return this.inputBuffer.map(b => b.input);
    }

    clearBuffer(): void {
        this.inputBuffer = [];
    }

    // ============================================================================
    // INPUT CONTROL
    // ============================================================================

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.state.keysDown.clear();
            this.state.mouseButtonsDown.clear();
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setInputMode(mode: InputMode): void {
        this.currentMode = mode;
        this.eventBus.emit('input.modeChanged', { mode });
    }

    getInputMode(): InputMode {
        return this.currentMode;
    }
}