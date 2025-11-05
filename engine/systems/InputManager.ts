// engine/systems/InputManager.ts
import type {GameStateManager} from '../core/GameStateManager';
import type {EventBus} from '../core/EventBus';
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
} from '../core/InputEvents';

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
    private stateManager: GameStateManager;
    private eventBus: EventBus;
    private targetElement: HTMLElement | null;

    private state: InputState;
    private enabled: boolean;
    private currentMode: InputMode;

    private actions: Map<string, InputAction>;

    private inputBuffer: BufferedInput[];
    private readonly bufferSize: number;
    private combos: Map<string, InputCombo>;

    private gamepadPollingInterval: number | null;
    private lastGamepadStates: Map<number, GamepadState>;

    private boundListeners: Map<string, EventListener>;

    constructor(stateManager: GameStateManager, eventBus: EventBus) {
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.targetElement = null;

        this.state = {
            keysDown: new Set(),
            mouseButtonsDown: new Set(),
            mousePosition: {x: 0, y: 0},
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

        this.boundListeners = new Map();
    }

    // ============================================================================
    // SETUP AND CLEANUP
    // ============================================================================

    attach(element: HTMLElement, options?: { focus?: boolean; tabindex?: string }): void {
        if (this.targetElement) {
            this.detach();
        }

        this.targetElement = element;

        if (options?.tabindex !== undefined) {
            element.setAttribute('tabindex', options.tabindex);
        } else if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }

        this.attachListeners();

        if (options?.focus) {
            element.focus();
        }
    }

    detach(): void {
        if (!this.targetElement) return;

        this.boundListeners.forEach((listener, event) => {
            this.targetElement!.removeEventListener(event, listener);
        });
        this.boundListeners.clear();

        this.targetElement = null;
    }

    private attachListeners(): void {
        if (!this.targetElement) return;

        const onKeyDown = this.onKeyDown.bind(this);
        const onKeyUp = this.onKeyUp.bind(this);
        const onMouseDown = this.onMouseDown.bind(this);
        const onMouseUp = this.onMouseUp.bind(this);
        const onMouseMove = this.onMouseMove.bind(this);
        const onWheel = this.onWheel.bind(this);
        const onClick = this.onClick.bind(this);
        const onTouchStart = this.onTouchStart.bind(this);
        const onTouchMove = this.onTouchMove.bind(this);
        const onTouchEnd = this.onTouchEnd.bind(this);

        this.targetElement.addEventListener('keydown', onKeyDown as EventListener);
        this.targetElement.addEventListener('keyup', onKeyUp as EventListener);
        this.targetElement.addEventListener('mousedown', onMouseDown as EventListener);
        this.targetElement.addEventListener('mouseup', onMouseUp as EventListener);
        this.targetElement.addEventListener('mousemove', onMouseMove as EventListener);
        this.targetElement.addEventListener('wheel', onWheel as EventListener);
        this.targetElement.addEventListener('click', onClick as EventListener);
        this.targetElement.addEventListener('touchstart', onTouchStart as EventListener);
        this.targetElement.addEventListener('touchmove', onTouchMove as EventListener);
        this.targetElement.addEventListener('touchend', onTouchEnd as EventListener);

        this.boundListeners.set('keydown', onKeyDown as EventListener);
        this.boundListeners.set('keyup', onKeyUp as EventListener);
        this.boundListeners.set('mousedown', onMouseDown as EventListener);
        this.boundListeners.set('mouseup', onMouseUp as EventListener);
        this.boundListeners.set('mousemove', onMouseMove as EventListener);
        this.boundListeners.set('wheel', onWheel as EventListener);
        this.boundListeners.set('click', onClick as EventListener);
        this.boundListeners.set('touchstart', onTouchStart as EventListener);
        this.boundListeners.set('touchmove', onTouchMove as EventListener);
        this.boundListeners.set('touchend', onTouchEnd as EventListener);
    }

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

    dispose(): void {
        this.detach();
        this.disableGamepadPolling();
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
        this.dispatchEvent(event, true);
        this.checkActionTriggers('key', e.key, {shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey});
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

        this.dispatchEvent(event, false);
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
        this.dispatchEvent(event, true);
        this.checkActionTriggers('mouse', e.button, {
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        });
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

        this.dispatchEvent(event, false);
    }

    private onMouseMove(e: MouseEvent): void {
        if (!this.enabled) return;

        const deltaX = e.clientX - this.state.mousePosition.x;
        const deltaY = e.clientY - this.state.mousePosition.y;

        this.state.mousePosition = {x: e.clientX, y: e.clientY};

        const event: MouseMoveEvent = {
            type: 'mousemove',
            timestamp: Date.now(),
            x: e.clientX,
            y: e.clientY,
            deltaX,
            deltaY,
            buttons: e.buttons
        };

        this.dispatchEvent(event, false);
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

        this.dispatchEvent(event, false);
    }

    private onClick(e: MouseEvent): void {
        if (!this.enabled) return;
        const target = e.target as HTMLElement;
        if (target?.dataset?.action) {
            this.eventBus.emit('input.action', {action: target.dataset.action});
        }
        const event: ClickEvent = {
            type: 'click',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            target: e.target
        };

        this.dispatchEvent(event, false);
    }

    // ============================================================================
    // TOUCH EVENTS
    // ============================================================================

    private onTouchStart(e: TouchEvent): void {
        if (!this.enabled) return;

        const touches = Array.from(e.touches).map(t => {
            this.state.touchPoints.set(t.identifier, {x: t.clientX, y: t.clientY});
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
        this.dispatchEvent(event, true);
    }

    private onTouchMove(e: TouchEvent): void {
        if (!this.enabled) return;

        const touches = Array.from(e.touches).map(t => {
            this.state.touchPoints.set(t.identifier, {x: t.clientX, y: t.clientY});
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

        this.dispatchEvent(event, false);
    }

    private onTouchEnd(e: TouchEvent): void {
        if (!this.enabled) return;

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

        this.dispatchEvent(event, false);
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

            gamepad.buttons.forEach((button, index) => {
                currentState.buttons.set(index, {pressed: button.pressed, value: button.value});

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

                    this.addToBuffer(`gamepad${i}_button${index}`);
                    this.dispatchEvent(event, true);
                    this.checkActionTriggers('gamepad', index);
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

                    this.dispatchEvent(event, false);
                }
            });

            this.lastGamepadStates.set(i, currentState);
            this.state.gamepadStates.set(i, currentState);
        }
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
        return {...this.state.mousePosition};
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
        this.actions.set(name, {name, bindings});
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
                this.eventBus.emit('input.action', {action: name});
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
        this.combos.set(name, {inputs, timeWindow});
    }

    private checkCombos(): void {
        this.combos.forEach((combo, name) => {
            if (this.isComboTriggered(combo)) {
                this.eventBus.emit('input.combo', {combo: name});
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
        this.eventBus.emit('input.modeChanged', {mode});
    }

    getInputMode(): InputMode {
        return this.currentMode;
    }
}