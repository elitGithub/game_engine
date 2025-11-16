/**
 * Input event types for the InputManager
 */

export interface BaseInputEvent {
    type: string;
    timestamp: number;
}

export interface KeyDownEvent extends BaseInputEvent {
    type: 'keydown';
    key: string;
    code: string;
    repeat: boolean;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

export interface KeyUpEvent extends BaseInputEvent {
    type: 'keyup';
    key: string;
    code: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

export interface MouseDownEvent extends BaseInputEvent {
    type: 'mousedown';
    button: number; // 0=left, 1=middle, 2=right
    x: number;
    y: number;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

export interface MouseUpEvent extends BaseInputEvent {
    type: 'mouseup';
    button: number;
    x: number;
    y: number;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

export interface MouseMoveEvent extends BaseInputEvent {
    type: 'mousemove';
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
    buttons: number; // Bitmask of pressed buttons
}

export interface MouseWheelEvent extends BaseInputEvent {
    type: 'wheel';
    deltaX: number;
    deltaY: number;
    deltaZ: number;
    x: number;
    y: number;
}

export interface ClickEvent extends BaseInputEvent {
    type: 'click';
    button: number;
    x: number;
    y: number;
    target: unknown;
    data?: Record<string, string>; // Generic data (e.g., dataset from HTMLElement)
}

export interface TouchStartEvent extends BaseInputEvent {
    type: 'touchstart';
    touches: TouchPoint[];
}

export interface TouchMoveEvent extends BaseInputEvent {
    type: 'touchmove';
    touches: TouchPoint[];
}

export interface TouchEndEvent extends BaseInputEvent {
    type: 'touchend';
    touches: TouchPoint[];
}

export interface TouchPoint {
    id: number;
    x: number;
    y: number;
    force: number;
}

export interface GamepadButtonEvent extends BaseInputEvent {
    type: 'gamepadbutton';
    gamepadIndex: number;
    button: number;
    pressed: boolean;
    value: number;
}

export interface GamepadAxisEvent extends BaseInputEvent {
    type: 'gamepadaxis';
    gamepadIndex: number;
    axis: number;
    value: number;
}

export type EngineInputEvent =
    | KeyDownEvent
    | KeyUpEvent
    | MouseDownEvent
    | MouseUpEvent
    | MouseMoveEvent
    | MouseWheelEvent
    | ClickEvent
    | TouchStartEvent
    | TouchMoveEvent
    | TouchEndEvent
    | GamepadButtonEvent
    | GamepadAxisEvent;

/**
 * Input action mapping
 */
export interface InputAction {
    name: string;
    bindings: InputBinding[];
}

export interface InputBinding {
    type: 'key' | 'mouse' | 'gamepad' | 'touch';
    input: string | number; // Key name, mouse button, gamepad button, etc
    modifiers?: {
        shift?: boolean;
        ctrl?: boolean;
        alt?: boolean;
        meta?: boolean;
    };
}

/**
 * Input combo for combo detection
 */
export interface InputCombo {
    inputs: string[];
    timeWindow: number; // milliseconds
}

/**
 * Input state tracking
 */
export interface InputState {
    keysDown: Set<string>;
    mouseButtonsDown: Set<number>;
    mousePosition: { x: number; y: number };
    touchPoints: Map<number, { x: number; y: number }>;
    gamepadStates: Map<number, GamepadState>;
}

export interface GamepadState {
    buttons: Map<number, { pressed: boolean; value: number }>;
    axes: Map<number, number>;
}