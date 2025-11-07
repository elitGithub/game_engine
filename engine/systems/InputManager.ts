// engine/systems/InputManager.ts
import type { GameStateManager } from '@engine/core/GameStateManager';
import type { EventBus } from '@engine/core/EventBus';
import type {
    EngineInputEvent,
    GamepadAxisEvent,
    GamepadButtonEvent,
    InputBinding, // <-- This import is used by the fix
} from '@engine/core/InputEvents';
import { InputMode } from "@engine/types/EngineEventMap";
import {InputActionMapper} from "@engine/input/InputActionMapper";
import {InputComboTracker} from "@engine/input/InputComboTracker";
import {GamepadState, InputState} from "@engine/input/InputState";



/**
 * InputManager - Platform-agnostic input handling
 *
 * This manager processes engine-agnostic input events and maintains input state.
 * It coordinates helper classes for action mapping and combo detection.
 */
export class InputManager {
    private stateManager: GameStateManager;
    private eventBus: EventBus;

    private state: InputState;
    private enabled: boolean;
    private currentMode: InputMode;

    // --- DELEGATED RESPONSIBILITIES ---
    private actionMapper: InputActionMapper;
    private comboTracker: InputComboTracker;
    // ----------------------------------

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

        // --- Instantiate helper classes ---
        this.actionMapper = new InputActionMapper(eventBus);
        this.comboTracker = new InputComboTracker(eventBus, 10); // 10 is default buffer size
        // ----------------------------------

        this.gamepadPollingInterval = null;
        this.lastGamepadStates = new Map();
    }

    // ============================================================================
    // EVENT PROCESSING (Core adapter interface)
    // ============================================================================

    public processEvent(event: EngineInputEvent): void {
        if (!this.enabled) return;

        switch (event.type) {
            case 'keydown':
                this.state.keysDown.add(event.key);
                this.comboTracker.addToBuffer(event.key); // DELEGATE
                this.dispatchEvent(event, true); // true = check combos
                this.actionMapper.checkActionTriggers('key', event.key, { // DELEGATE
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
                this.comboTracker.addToBuffer(`mouse${event.button}`); // DELEGATE
                this.dispatchEvent(event, true); // true = check combos
                this.actionMapper.checkActionTriggers('mouse', event.button, { // DELEGATE
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
                const target = event.target as HTMLElement | null;
                if (target?.dataset && Object.keys(target.dataset).length > 0) {
                    const data: Record<string, string> = {};
                    for (const [key, value] of Object.entries(target.dataset)) {
                        if (value !== undefined) {
                            data[key] = value;
                        }
                    }
                    this.eventBus.emit('input.hotspot', {
                        element: target,
                        data
                    });
                }
                this.dispatchEvent(event, false);
                break;

            case 'touchstart':
                event.touches.forEach(touch => {
                    this.state.touchPoints.set(touch.id, { x: touch.x, y: touch.y });
                });
                this.comboTracker.addToBuffer(`touch${event.touches.length}`); // DELEGATE
                this.dispatchEvent(event, true); // true = check combos
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
                    this.comboTracker.addToBuffer(`gamepad${event.gamepadIndex}_button${event.button}`); // DELEGATE
                    this.actionMapper.checkActionTriggers('gamepad', event.button); // DELEGATE
                }
                this.dispatchEvent(event, event.pressed); // true = check combos if pressed
                break;

            case 'gamepadaxis':
                this.dispatchEvent(event, false);
                break;
        }
    }

    // ============================================================================
    // GAMEPAD POLLING (Remains unchanged)
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
    // EVENT DISPATCHING (Delegates combo check)
    // ============================================================================

    private dispatchEvent(event: EngineInputEvent, checkCombos: boolean): void {
        this.stateManager.handleEvent(event);
        if (checkCombos) {
            this.comboTracker.checkCombos(); // DELEGATE
        }
        this.eventBus.emit(`input.${event.type}`, event);
    }

    // ============================================================================
    // INPUT STATE QUERIES (Remains unchanged)
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
        // <-- FIX: Explicitly type the tuple to fix TS2345
        return Array.from(this.state.touchPoints.entries()).map(
            ([id, pos]: [number, { x: number; y: number }]) => ({
                id,
                ...pos
            })
        );
    }

    isGamepadButtonPressed(gamepadIndex: number, button: number): boolean {
        return this.state.gamepadStates.get(gamepadIndex)?.buttons.get(button)?.pressed || false;
    }

    getGamepadAxis(gamepadIndex: number, axis: number): number {
        return this.state.gamepadStates.get(gamepadIndex)?.axes.get(axis) || 0;
    }

    // ============================================================================
    // INPUT ACTIONS (Now delegates)
    // ============================================================================

    public registerAction(name: string, bindings: InputBinding[]): void {
        this.actionMapper.registerAction(name, bindings); // DELEGATE
    }

    public isActionTriggered(actionName: string): boolean {
        const action = this.actionMapper.getActions().get(actionName); // DELEGATE
        if (!action) return false;

        // <-- FIX: Explicitly type 'binding' to fix TS7006
        return action.bindings.some((binding: InputBinding) => {
            if (binding.type === 'key') {
                const keyDown = this.isKeyDown(binding.input as string);
                if (!keyDown) return false;

                const bindingMods = {
                    shift: binding.modifiers?.shift ?? false,
                    ctrl: binding.modifiers?.ctrl ?? false,
                    alt: binding.modifiers?.alt ?? false,
                    meta: binding.modifiers?.meta ?? false,
                };

                // Check this manager's state against the mapper's config
                if (bindingMods.shift && !this.isKeyDown('Shift')) return false;
                if (!bindingMods.shift && this.isKeyDown('Shift')) return false;

                if (bindingMods.ctrl && !this.isKeyDown('Control')) return false;
                if (!bindingMods.ctrl && this.isKeyDown('Control')) return false;

                if (bindingMods.alt && !this.isKeyDown('Alt')) return false;
                if (!bindingMods.alt && this.isKeyDown('Alt')) return false;

                if (bindingMods.meta && !this.isKeyDown('Meta')) return false;
                return !(!bindingMods.meta && this.isKeyDown('Meta'));


            } else if (binding.type === 'mouse') {
                return this.isMouseButtonDown(binding.input as number);
            } else if (binding.type === 'gamepad') {
                return this.isGamepadButtonPressed(0, binding.input as number);
            }

            return false;
        });
    }

    // ============================================================================
    // INPUT BUFFERING AND COMBOS (Now delegates)
    // ============================================================================

    public registerCombo(name: string, inputs: string[], timeWindow: number = 1000): void {
        this.comboTracker.registerCombo(name, inputs, timeWindow); // DELEGATE
    }

    public getInputBuffer(): string[] {
        return this.comboTracker.getInputBuffer(); // DELEGATE
    }

    public clearBuffer(): void {
        this.comboTracker.clearBuffer(); // DELEGATE
    }

    // ============================================================================
    // INPUT CONTROL (Remains unchanged)
    // ============================================================================

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.state.keysDown.clear();
            this.state.mouseButtonsDown.clear();
        }
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setInputMode(mode: InputMode): void {
        this.currentMode = mode;
        this.eventBus.emit('input.modeChanged', { mode });
    }

    public getInputMode(): InputMode {
        return this.currentMode;
    }
}