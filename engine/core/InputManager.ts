/**
 * InputManager - Comprehensive centralized input handling
 *
 * Features:
 * - All input types: keyboard, mouse, touch, gamepad
 * - Input state tracking (isKeyDown, etc)
 * - Input buffering and combo detection
 * - Key rebinding system
 * - Input blocking/enabling
 * - Input modes/contexts
 * - Backward compatibility
 */
import type { Engine } from '../Engine';
import type {
    EngineInputEvent,
    KeyDownEvent,
    KeyUpEvent,
    MouseDownEvent,
    MouseUpEvent,
    MouseMoveEvent,
    MouseWheelEvent,
    ClickEvent,
    TouchStartEvent,
    TouchMoveEvent,
    TouchEndEvent,
    GamepadButtonEvent,
    GamepadAxisEvent,
    InputAction,
    InputBinding,
    InputCombo
} from './InputEvents';

export type InputMode = 'gameplay' | 'menu' | 'cutscene' | 'disabled' | string;

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

export class InputManager {
    private engine: Engine;
    private targetElement: HTMLElement;

    // Input state
    private state: InputState;
    private enabled: boolean;
    private currentMode: InputMode;

    // Input actions (rebinding)
    private actions: Map<string, InputAction>;

    // Input buffering and combos
    private inputBuffer: BufferedInput[];
    private bufferSize: number;
    private combos: Map<string, InputCombo>;

    // Gamepad polling
    private gamepadPollingInterval: number | null;
    private lastGamepadStates: Map<number, GamepadState>;

    // Event listeners (for cleanup)
    private boundListeners: Map<string, EventListener>;

    constructor(engine: Engine, targetElement: HTMLElement) {
        this.engine = engine;
        this.targetElement = targetElement;

        // Initialize state
        this.state = {
            keysDown: new Set(),
            mouseButtonsDown: new Set(),
            mousePosition: { x: 0, y: 0 },
            touchPoints: new Map(),
            gamepadStates: new Map()
        };

        this.enabled = true;
        this.currentMode = 'gameplay';

        // Initialize actions and combos
        this.actions = new Map();
        this.combos = new Map();

        // Initialize buffering
        this.inputBuffer = [];
        this.bufferSize = 10; // Keep last 10 inputs

        // Gamepad
        this.gamepadPollingInterval = null;
        this.lastGamepadStates = new Map();

        // Store bound listeners for cleanup
        this.boundListeners = new Map();

        // Attach event listeners
        this.attachListeners();

        // Start gamepad polling
        this.startGamepadPolling();
    }

    // ============================================================================
    // SETUP AND CLEANUP
    // ============================================================================

    private attachListeners(): void {
        // Keyboard
        const onKeyDown = this.onKeyDown.bind(this);
        const onKeyUp = this.onKeyUp.bind(this);

        // Mouse
        const onMouseDown = this.onMouseDown.bind(this);
        const onMouseUp = this.onMouseUp.bind(this);
        const onMouseMove = this.onMouseMove.bind(this);
        const onWheel = this.onWheel.bind(this);
        const onClick = this.onClick.bind(this);

        // Touch
        const onTouchStart = this.onTouchStart.bind(this);
        const onTouchMove = this.onTouchMove.bind(this);
        const onTouchEnd = this.onTouchEnd.bind(this);

        // Attach to target
        this.targetElement.addEventListener('keydown', onKeyDown);
        this.targetElement.addEventListener('keyup', onKeyUp);
        this.targetElement.addEventListener('mousedown', onMouseDown);
        this.targetElement.addEventListener('mouseup', onMouseUp);
        this.targetElement.addEventListener('mousemove', onMouseMove);
        this.targetElement.addEventListener('wheel', onWheel);
        this.targetElement.addEventListener('click', onClick);
        this.targetElement.addEventListener('touchstart', onTouchStart);
        this.targetElement.addEventListener('touchmove', onTouchMove);
        this.targetElement.addEventListener('touchend', onTouchEnd);

        // Store for cleanup
        this.boundListeners.set('keydown', onKeyDown);
        this.boundListeners.set('keyup', onKeyUp);
        this.boundListeners.set('mousedown', onMouseDown);
        this.boundListeners.set('mouseup', onMouseUp);
        this.boundListeners.set('mousemove', onMouseMove);
        this.boundListeners.set('wheel', onWheel);
        this.boundListeners.set('click', onClick);
        this.boundListeners.set('touchstart', onTouchStart);
        this.boundListeners.set('touchmove', onTouchMove);
        this.boundListeners.set('touchend', onTouchEnd);

        // Make element focusable
        if (!this.targetElement.hasAttribute('tabindex')) {
            this.targetElement.setAttribute('tabindex', '0');
        }
        this.targetElement.focus();
    }

    private startGamepadPolling(): void {
        // Poll gamepads at 60fps
        this.gamepadPollingInterval = window.setInterval(() => {
            this.pollGamepads();
        }, 16);
    }

    dispose(): void {
        // Remove event listeners
        this.boundListeners.forEach((listener, event) => {
            this.targetElement.removeEventListener(event, listener);
        });
        this.boundListeners.clear();

        // Stop gamepad polling
        if (this.gamepadPollingInterval !== null) {
            clearInterval(this.gamepadPollingInterval);
            this.gamepadPollingInterval = null;
        }
    }

    // ============================================================================
    // KEYBOARD EVENTS
    // ============================================================================

    private onKeyDown(e: KeyboardEvent): void {
        if (!this.enabled) return;

        this.state.keysDown.add(e.key);

        const event: KeyDownEvent = {
            type: 'keydown',
            timestamp: Date.now(),
            key: e.key,
            code: e.code,
            repeat: e.repeat,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.addToBuffer(e.key);
        this.dispatchEvent(event);

        // Check for action triggers
        this.checkActionTriggers('key', e.key, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey });
    }

    private onKeyUp(e: KeyboardEvent): void {
        if (!this.enabled) return;

        this.state.keysDown.delete(e.key);

        const event: KeyUpEvent = {
            type: 'keyup',
            timestamp: Date.now(),
            key: e.key,
            code: e.code,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.dispatchEvent(event);
    }

    // ============================================================================
    // MOUSE EVENTS
    // ============================================================================

    private onMouseDown(e: MouseEvent): void {
        if (!this.enabled) return;

        this.state.mouseButtonsDown.add(e.button);

        const event: MouseDownEvent = {
            type: 'mousedown',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.addToBuffer(`mouse${e.button}`);
        this.dispatchEvent(event);

        // Check for action triggers
        this.checkActionTriggers('mouse', e.button, { shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey });
    }

    private onMouseUp(e: MouseEvent): void {
        if (!this.enabled) return;

        this.state.mouseButtonsDown.delete(e.button);

        const event: MouseUpEvent = {
            type: 'mouseup',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.dispatchEvent(event);
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.enabled) return;

        const deltaX = e.clientX - this.state.mousePosition.x;
        const deltaY = e.clientY - this.state.mousePosition.y;

        this.state.mousePosition = { x: e.clientX, y: e.clientY };

        const event: MouseMoveEvent = {
            type: 'mousemove',
            timestamp: Date.now(),
            x: e.clientX,
            y: e.clientY,
            deltaX,
            deltaY,
            buttons: e.buttons
        };

        this.dispatchEvent(event);
    }

    private onWheel(e: WheelEvent): void {
        if (!this.enabled) return;

        const event: MouseWheelEvent = {
            type: 'wheel',
            timestamp: Date.now(),
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            x: e.clientX,
            y: e.clientY
        };

        this.dispatchEvent(event);
    }

    private onClick(e: MouseEvent): void {
        if (!this.enabled) return;

        const event: ClickEvent = {
            type: 'click',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            target: e.target
        };

        this.dispatchEvent(event);
    }

    // ============================================================================
    // TOUCH EVENTS
    // ============================================================================

    private onTouchStart(e: TouchEvent): void {
        if (!this.enabled) return;

        const touches = Array.from(e.touches).map(t => {
            this.state.touchPoints.set(t.identifier, { x: t.clientX, y: t.clientY });
            return {
                id: t.identifier,
                x: t.clientX,
                y: t.clientY,
                force: t.force
            };
        });

        const event: TouchStartEvent = {
            type: 'touchstart',
            timestamp: Date.now(),
            touches
        };

        this.addToBuffer(`touch${touches.length}`);
        this.dispatchEvent(event);
    }

    private onTouchMove(e: TouchEvent): void {
        if (!this.enabled) return;

        const touches = Array.from(e.touches).map(t => {
            this.state.touchPoints.set(t.identifier, { x: t.clientX, y: t.clientY });
            return {
                id: t.identifier,
                x: t.clientX,
                y: t.clientY,
                force: t.force
            };
        });

        const event: TouchMoveEvent = {
            type: 'touchmove',
            timestamp: Date.now(),
            touches
        };

        this.dispatchEvent(event);
    }

    private onTouchEnd(e: TouchEvent): void {
        if (!this.enabled) return;

        // Remove ended touches
        Array.from(e.changedTouches).forEach(t => {
            this.state.touchPoints.delete(t.identifier);
        });

        const touches = Array.from(e.touches).map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY,
            force: t.force
        }));

        const event: TouchEndEvent = {
            type: 'touchend',
            timestamp: Date.now(),
            touches
        };

        this.dispatchEvent(event);
    }

    // ============================================================================
    // GAMEPAD POLLING
    // ============================================================================

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

            // Check buttons
            gamepad.buttons.forEach((button, index) => {
                currentState.buttons.set(index, { pressed: button.pressed, value: button.value });

                const wasPressed = lastState?.buttons.get(index)?.pressed || false;

                if (button.pressed && !wasPressed) {
                    // Button just pressed
                    const event: GamepadButtonEvent = {
                        type: 'gamepadbutton',
                        timestamp: Date.now(),
                        gamepadIndex: i,
                        button: index,
                        pressed: true,
                        value: button.value
                    };

                    this.addToBuffer(`gamepad${i}_button${index}`);
                    this.dispatchEvent(event);
                    this.checkActionTriggers('gamepad', index);
                }
            });

            // Check axes
            gamepad.axes.forEach((value, index) => {
                currentState.axes.set(index, value);

                const lastValue = lastState?.axes.get(index) || 0;

                // Only emit if significant change (deadzone)
                if (Math.abs(value - lastValue) > 0.1) {
                    const event: GamepadAxisEvent = {
                        type: 'gamepadaxis',
                        timestamp: Date.now(),
                        gamepadIndex: i,
                        axis: index,
                        value
                    };

                    this.dispatchEvent(event);
                }
            });

            this.lastGamepadStates.set(i, currentState);
            this.state.gamepadStates.set(i, currentState);
        }
    }

    // ============================================================================
    // EVENT DISPATCHING
    // ============================================================================

    private dispatchEvent(event: EngineInputEvent): void {
        // Dispatch to current game state
        const currentState = this.engine.stateManager.getCurrentState();
        if (currentState && currentState.isActive) {
            // New method: handleEvent (rich event)
            if (typeof (currentState as any).handleEvent === 'function') {
                (currentState as any).handleEvent(event);
            }
        }

        // Check combos
        this.checkCombos();

        // Emit event on EventBus
        this.engine.eventBus.emit(`input.${event.type}`, event);
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

                // Check modifiers
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

                // Check modifiers for keyboard
                if (type === 'key' && binding.modifiers && modifiers) {
                    if (binding.modifiers.shift !== modifiers.shift) return false;
                    if (binding.modifiers.ctrl !== modifiers.ctrl) return false;
                    if (binding.modifiers.alt !== modifiers.alt) return false;
                    if (binding.modifiers.meta !== modifiers.meta) return false;
                }

                return true;
            });

            if (triggered) {
                this.engine.eventBus.emit('input.action', { action: name });
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

        // Trim buffer
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
                this.engine.eventBus.emit('input.combo', { combo: name });
            }
        });
    }

    private isComboTriggered(combo: InputCombo): boolean {
        if (this.inputBuffer.length < combo.inputs.length) return false;

        const recent = this.inputBuffer.slice(-combo.inputs.length);
        const now = Date.now();

        // Check if all inputs match and within time window
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
            // Clear state when disabling
            this.state.keysDown.clear();
            this.state.mouseButtonsDown.clear();
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setInputMode(mode: InputMode): void {
        this.currentMode = mode;
        this.engine.eventBus.emit('input.modeChanged', { mode });
    }

    getInputMode(): InputMode {
        return this.currentMode;
    }

    // ============================================================================
    // BACKWARD COMPATIBILITY
    // ============================================================================

    /**
     * Legacy method for backward compatibility
     * Converts string input to simple event and dispatches
     */
    handleInput(input: string): void {
        // Try to parse as number (choice index)
        const choiceIndex = parseInt(input);
        if (!isNaN(choiceIndex)) {
            this.engine.eventBus.emit('input.choice', { index: choiceIndex });
        }

        // Dispatch to current state's legacy handleInput
        const currentState = this.engine.stateManager.getCurrentState();
        if (currentState && currentState.isActive) {
            if (typeof (currentState as any).handleInput === 'function') {
                (currentState as any).handleInput(input);
            }
        }
    }
}