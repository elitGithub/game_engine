// engine/systems/InputManager.ts
import type { GameStateManager } from '@engine/core/GameStateManager';
import type { EventBus } from '@engine/core/EventBus';
import type {
    EngineInputEvent,
    InputBinding,
    InputState,
} from '@engine/types/InputEvents';
import type { InputMode } from "@engine/types/EngineEventMap";
import {InputActionMapper} from "@engine/input/InputActionMapper";
import {InputComboTracker} from "@engine/input/InputComboTracker";
import type { ITimerProvider, ILogger } from '@engine/interfaces';



/**
 * InputManager - Platform-agnostic input handling
 *
 * This manager processes engine-agnostic input events and maintains input state.
 * It coordinates helper classes for action mapping and combo detection.
 */
export class InputManager {
    private static readonly DEFAULT_COMBO_BUFFER_SIZE = 10;
    private static readonly DEFAULT_COMBO_TIME_WINDOW_MS = 1000;
    private static readonly DEFAULT_GAMEPAD_INDEX = 0;

    private readonly stateManager: GameStateManager;
    private readonly eventBus: EventBus;
    private readonly logger: ILogger;

    private readonly state: InputState;
    private enabled: boolean;
    private currentMode: InputMode;

    // ============================================================================
    // DELEGATED RESPONSIBILITIES
    // ============================================================================
    private readonly actionMapper: InputActionMapper;
    private readonly comboTracker: InputComboTracker;

    constructor(
        stateManager: GameStateManager,
        eventBus: EventBus,
        timer: ITimerProvider,
        logger: ILogger
    ) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.logger = logger;

        this.state = {
            keysDown: new Set(),
            mouseButtonsDown: new Set(),
            mousePosition: { x: 0, y: 0 },
            touchPoints: new Map(),
            gamepadStates: new Map()
        };

        this.enabled = true;
        this.currentMode = 'gameplay';

        // Instantiate helper classes
        this.actionMapper = new InputActionMapper(eventBus);
        this.comboTracker = new InputComboTracker(eventBus, timer, InputManager.DEFAULT_COMBO_BUFFER_SIZE);

        this.logger.log('[InputManager] Initialized with action mapper and combo tracker');
    }

    // ============================================================================
    // EVENT PROCESSING (Core adapter interface)
    // ============================================================================

    /**
     * Processes a platform-agnostic input event and updates internal state.
     * Delegates to action mapper and combo tracker for high-level input handling.
     *
     * @param event - The engine input event to process
     */
    public processEvent(event: EngineInputEvent): void {
        if (!this.enabled) return;

        switch (event.type) {
            case 'keydown':
                this.handleKeyDown(event);
                break;
            case 'keyup':
                this.handleKeyUp(event);
                break;
            case 'mousedown':
                this.handleMouseDown(event);
                break;
            case 'mouseup':
                this.handleMouseUp(event);
                break;
            case 'mousemove':
                this.handleMouseMove(event);
                break;
            case 'wheel':
                this.handleWheel(event);
                break;
            case 'click':
                this.handleClick(event);
                break;
            case 'touchstart':
                this.handleTouchStart(event);
                break;
            case 'touchmove':
                this.handleTouchMove(event);
                break;
            case 'touchend':
                this.handleTouchEnd(event);
                break;
            case 'gamepadbutton':
                this.handleGamepadButton(event);
                break;
            case 'gamepadaxis':
                this.handleGamepadAxis(event);
                break;
        }
    }

    // ============================================================================
    // EVENT TYPE HANDLERS (Extracted from processEvent)
    // ============================================================================

    private handleKeyDown(event: Extract<EngineInputEvent, { type: 'keydown' }>): void {
        this.state.keysDown.add(event.key);
        this.comboTracker.addToBuffer(event.key, event.timestamp);
        this.dispatchEvent(event, true);
        this.actionMapper.checkActionTriggers('key', event.key, {
            shift: event.shift,
            ctrl: event.ctrl,
            alt: event.alt,
            meta: event.meta
        });
    }

    private handleKeyUp(event: Extract<EngineInputEvent, { type: 'keyup' }>): void {
        this.state.keysDown.delete(event.key);
        this.dispatchEvent(event, false);
    }

    private handleMouseDown(event: Extract<EngineInputEvent, { type: 'mousedown' }>): void {
        this.state.mouseButtonsDown.add(event.button);
        this.comboTracker.addToBuffer(`mouse${event.button}`, event.timestamp);
        this.dispatchEvent(event, true);
        this.actionMapper.checkActionTriggers('mouse', event.button, {
            shift: event.shift,
            ctrl: event.ctrl,
            alt: event.alt,
            meta: event.meta
        });
    }

    private handleMouseUp(event: Extract<EngineInputEvent, { type: 'mouseup' }>): void {
        this.state.mouseButtonsDown.delete(event.button);
        this.dispatchEvent(event, false);
    }

    private handleMouseMove(event: Extract<EngineInputEvent, { type: 'mousemove' }>): void {
        this.state.mousePosition = { x: event.x, y: event.y };
        this.dispatchEvent(event, false);
    }

    private handleWheel(event: Extract<EngineInputEvent, { type: 'wheel' }>): void {
        this.dispatchEvent(event, false);
    }

    private handleClick(event: Extract<EngineInputEvent, { type: 'click' }>): void {
        if (event.data && Object.keys(event.data).length > 0) {
            this.eventBus.emit('input.hotspot', {
                element: event.target,
                data: event.data
            });
        }
        this.dispatchEvent(event, false);
    }

    private handleTouchStart(event: Extract<EngineInputEvent, { type: 'touchstart' }>): void {
        event.touches.forEach(touch => {
            this.state.touchPoints.set(touch.id, { x: touch.x, y: touch.y });
        });
        this.comboTracker.addToBuffer(`touch${event.touches.length}`, event.timestamp);
        this.dispatchEvent(event, true);
    }

    private handleTouchMove(event: Extract<EngineInputEvent, { type: 'touchmove' }>): void {
        event.touches.forEach(touch => {
            this.state.touchPoints.set(touch.id, { x: touch.x, y: touch.y });
        });
        this.dispatchEvent(event, false);
    }

    private handleTouchEnd(event: Extract<EngineInputEvent, { type: 'touchend' }>): void {
        event.touches.forEach(touch => {
            this.state.touchPoints.delete(touch.id);
        });
        this.dispatchEvent(event, false);
    }

    private handleGamepadButton(event: Extract<EngineInputEvent, { type: 'gamepadbutton' }>): void {
        const gamepadButtonState = this.state.gamepadStates.get(event.gamepadIndex) ?? {
            buttons: new Map(),
            axes: new Map()
        };
        gamepadButtonState.buttons.set(event.button, {
            pressed: event.pressed,
            value: event.value
        });
        this.state.gamepadStates.set(event.gamepadIndex, gamepadButtonState);

        if (event.pressed) {
            this.comboTracker.addToBuffer(`gamepad${event.gamepadIndex}_button${event.button}`, event.timestamp);
            this.actionMapper.checkActionTriggers('gamepad', event.button);
        }
        this.dispatchEvent(event, event.pressed);
    }

    private handleGamepadAxis(event: Extract<EngineInputEvent, { type: 'gamepadaxis' }>): void {
        const gamepadState = this.state.gamepadStates.get(event.gamepadIndex) ?? {
            buttons: new Map(),
            axes: new Map()
        };
        gamepadState.axes.set(event.axis, event.value);
        this.state.gamepadStates.set(event.gamepadIndex, gamepadState);
        this.dispatchEvent(event, false);
    }

    // ============================================================================
    // EVENT DISPATCHING (Delegates combo check)
    // ============================================================================

    private dispatchEvent(event: EngineInputEvent, checkCombos: boolean): void {
        this.stateManager.handleEvent(event);
        if (checkCombos) {
            this.comboTracker.checkCombos();
        }
        this.eventBus.emit(`input.${event.type}`, event);
    }

    // ============================================================================
    // INPUT STATE QUERIES (Remains unchanged)
    // ============================================================================

    /**
     * Checks if a keyboard key is currently pressed.
     *
     * @param key - The key code to check (e.g., 'Enter', 'Escape', 'a')
     * @returns True if the key is currently down
     */
    public isKeyDown(key: string): boolean {
        return this.state.keysDown.has(key);
    }

    /**
     * Checks if a mouse button is currently pressed.
     *
     * @param button - The mouse button number (0 = left, 1 = middle, 2 = right)
     * @returns True if the button is currently down
     */
    public isMouseButtonDown(button: number): boolean {
        return this.state.mouseButtonsDown.has(button);
    }

    /**
     * Gets the current mouse position in viewport coordinates.
     *
     * @returns A copy of the current mouse position {x, y}
     */
    public getMousePosition(): { x: number; y: number } {
        return { ...this.state.mousePosition };
    }

    /**
     * Gets all currently active touch points.
     *
     * @returns Array of touch points with id and position {id, x, y}
     */
    public getTouchPoints(): Array<{ id: number; x: number; y: number }> {
        return Array.from(this.state.touchPoints.entries()).map(
            ([id, pos]: [number, { x: number; y: number }]) => ({
                id,
                ...pos
            })
        );
    }

    /**
     * Checks if a gamepad button is currently pressed.
     *
     * @param gamepadIndex - The gamepad index (0-based)
     * @param button - The button number
     * @returns True if the button is currently pressed
     */
    public isGamepadButtonPressed(gamepadIndex: number, button: number): boolean {
        return this.state.gamepadStates.get(gamepadIndex)?.buttons.get(button)?.pressed ?? false;
    }

    /**
     * Gets the current value of a gamepad axis.
     *
     * @param gamepadIndex - The gamepad index (0-based)
     * @param axis - The axis number
     * @returns The axis value (-1.0 to 1.0), or 0 if not available
     */
    public getGamepadAxis(gamepadIndex: number, axis: number): number {
        return this.state.gamepadStates.get(gamepadIndex)?.axes.get(axis) ?? 0;
    }

    // ============================================================================
    // INPUT ACTIONS (Now delegates)
    // ============================================================================

    /**
     * Registers a named input action with one or more input bindings.
     * Actions can be triggered by keyboard keys, mouse buttons, or gamepad buttons,
     * with optional modifier key requirements.
     *
     * @param name - The action name (e.g., 'jump', 'attack')
     * @param bindings - Array of input bindings that trigger this action
     */
    public registerAction(name: string, bindings: InputBinding[]): void {
        this.actionMapper.registerAction(name, bindings);
    }

    /**
     * Checks if the current modifier key state matches the required modifiers.
     * Each modifier must match exactly (present if required, absent if not required).
     *
     * @param requiredModifiers - The modifiers required by the binding
     * @returns True if all modifier states match exactly
     */
    private checkModifiers(requiredModifiers: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }): boolean {
        const modifierKeys = [
            { name: 'Shift' as const, required: requiredModifiers.shift },
            { name: 'Control' as const, required: requiredModifiers.ctrl },
            { name: 'Alt' as const, required: requiredModifiers.alt },
            { name: 'Meta' as const, required: requiredModifiers.meta }
        ];

        return modifierKeys.every(({ name, required }) =>
            this.isKeyDown(name) === required
        );
    }

    /**
     * Checks if a registered action is currently triggered based on current input state.
     * Evaluates all bindings for the action, including modifier key requirements.
     *
     * @param actionName - The name of the action to check
     * @returns True if any binding for the action is currently satisfied
     */
    public isActionTriggered(actionName: string): boolean {
        const action = this.actionMapper.getActions().get(actionName);
        if (!action) return false;

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

                return this.checkModifiers(bindingMods);

            } else if (binding.type === 'mouse') {
                return this.isMouseButtonDown(binding.input as number);
            } else if (binding.type === 'gamepad') {
                return this.isGamepadButtonPressed(InputManager.DEFAULT_GAMEPAD_INDEX, binding.input as number);
            }

            return false;
        });
    }

    // ============================================================================
    // INPUT BUFFERING AND COMBOS (Now delegates)
    // ============================================================================

    /**
     * Registers a named input combo (sequence of inputs within a time window).
     * When the combo is detected, an 'input.combo' event is emitted.
     *
     * @param name - The combo name (e.g., 'hadouken', 'konami-code')
     * @param inputs - Array of input strings in sequence (e.g., ['ArrowDown', 'ArrowRight', 'a'])
     * @param timeWindow - Maximum time in milliseconds for the full sequence (default: 1000ms)
     */
    public registerCombo(name: string, inputs: string[], timeWindow: number = InputManager.DEFAULT_COMBO_TIME_WINDOW_MS): void {
        this.comboTracker.registerCombo(name, inputs, timeWindow);
    }

    /**
     * Gets the current input buffer (recent inputs for combo detection).
     *
     * @returns Array of recent input strings in chronological order
     */
    public getInputBuffer(): string[] {
        return this.comboTracker.getInputBuffer();
    }

    /**
     * Clears the input buffer, resetting combo detection.
     */
    public clearBuffer(): void {
        this.comboTracker.clearBuffer();
    }

    // ============================================================================
    // INPUT CONTROL (Remains unchanged)
    // ============================================================================

    /**
     * Enables or disables input processing.
     * When disabled, all input events are ignored and input state is cleared.
     *
     * @param enabled - True to enable input processing, false to disable
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.state.keysDown.clear();
            this.state.mouseButtonsDown.clear();
            this.state.touchPoints.clear();
            this.state.gamepadStates.clear();
        }
    }

    /**
     * Checks if input processing is currently enabled.
     *
     * @returns True if input processing is enabled
     */
    public isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Sets the current input mode and emits an 'input.modeChanged' event.
     * Input modes can be used to context-switch input handling (e.g., 'gameplay' vs 'menu').
     *
     * @param mode - The input mode to activate
     */
    public setInputMode(mode: InputMode): void {
        this.currentMode = mode;
        this.eventBus.emit('input.modeChanged', { mode });
    }

    /**
     * Gets the current input mode.
     *
     * @returns The currently active input mode
     */
    public getInputMode(): InputMode {
        return this.currentMode;
    }
}