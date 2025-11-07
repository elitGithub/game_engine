// engine/systems/input/InputState.ts

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