/**
 * GamepadInputAdapter - Browser gamepad input adapter
 *
 * This adapter polls the Gamepad API and emits engine-agnostic input events.
 *
 * Platform coupling: This file is ALLOWED to access browser globals (navigator, window)
 * because it is a PLATFORM ADAPTER. It abstracts these away from the core engine.
 *
 * The core InputManager NEVER touches navigator or window - it receives
 * platform-agnostic events from this adapter.
 */

import { BaseInputAdapter, type InputAdapterType, type InputCapabilities, type InputAttachOptions } from '@engine/interfaces/IInputAdapter';
import type { GamepadButtonEvent, GamepadAxisEvent } from '@engine/core/InputEvents';
import type {ILogger, IRenderContainer} from '@engine/interfaces';
import type { ITimerProvider } from '@engine/interfaces';

/**
 * Gamepad button state
 */
interface GamepadButtonState {
    pressed: boolean;
    value: number;
}

/**
 * Gamepad state snapshot
 */
interface GamepadState {
    buttons: Map<number, GamepadButtonState>;
    axes: Map<number, number>;
}

/**
 * GamepadInputAdapter - Polls browser gamepad API
 *
 * This adapter:
 * - Polls navigator.getGamepads() at 60Hz
 * - Detects button press/release changes
 * - Detects axis value changes
 * - Emits gamepadbutton and gamepadaxis events
 * - Manages its own lifecycle (polling start/stop)
 *
 * Usage:
 * ```typescript
 * const adapter = new GamepadInputAdapter();
 * adapter.onEvent((event) => inputManager.processEvent(event));
 * adapter.attach(); // Starts polling
 * // Later...
 * adapter.detach(); // Stops polling
 * ```
 */
export class GamepadInputAdapter extends BaseInputAdapter {
    private static readonly DEFAULT_POLL_RATE_MS = 16; // ~60Hz (1000ms / 60fps)
    private static readonly AXIS_DEADZONE_THRESHOLD = 0.1; // 10% deadzone to filter noise

    private pollingTimerId: unknown | null = null;
    private lastGamepadStates: Map<number, GamepadState> = new Map();
    private readonly pollRate: number;
    private readonly timer: ITimerProvider;

    /**
     * @param timer Timer provider for platform-agnostic polling
     * @param pollRate Polling rate in milliseconds (default: 16ms = ~60Hz)
     * @param logger ILogger
     */
    constructor(timer: ITimerProvider, pollRate: number = GamepadInputAdapter.DEFAULT_POLL_RATE_MS, private logger: ILogger) {
        super();
        this.timer = timer;
        this.pollRate = pollRate;
    }

    getType(): InputAdapterType {
        return 'gamepad';
    }

    /**
     * Attach adapter (starts polling)
     *
     * Note: Gamepad input is global, so container is optional and unused.
     */
    attach(container?: IRenderContainer, options?: InputAttachOptions): boolean {
        // Check if browser supports Gamepad API
        if (typeof navigator === 'undefined' || !navigator.getGamepads) {
            this.logger.warn('[GamepadInputAdapter] Gamepad API not supported in this environment.');
            return false;
        }

        // Already attached
        if (this.attached) {
            return true;
        }

        // Start polling
        this.startPolling();
        this.attached = true;

        return true;
    }

    /**
     * Detach adapter (stops polling)
     */
    detach(): void {
        if (!this.attached) {
            return;
        }

        this.stopPolling();
        this.lastGamepadStates.clear();
        this.attached = false;
    }

    /**
     * Start polling the Gamepad API
     */
    private startPolling(): void {
        if (this.pollingTimerId !== null) {
            return;
        }

        const poll = () => {
            this.pollGamepads();
            this.pollingTimerId = this.timer.setTimeout(poll, this.pollRate);
        };

        this.pollingTimerId = this.timer.setTimeout(poll, this.pollRate);
    }

    /**
     * Stop polling the Gamepad API
     */
    private stopPolling(): void {
        if (this.pollingTimerId === null) {
            return;
        }

        this.timer.clearTimeout(this.pollingTimerId);
        this.pollingTimerId = null;
    }

    /**
     * Poll all connected gamepads and emit events for changes
     */
    private pollGamepads(): void {
        if (!this.enabled) {
            return;
        }

        const gamepads = navigator.getGamepads();

        for (let i = 0; i < gamepads.length; i++) {
            const gamepad = gamepads[i];
            if (!gamepad) {
                continue;
            }

            const lastState = this.lastGamepadStates.get(i);
            const currentState: GamepadState = {
                buttons: new Map(),
                axes: new Map()
            };

            // Check button changes
            gamepad.buttons.forEach((button, index) => {
                currentState.buttons.set(index, {
                    pressed: button.pressed,
                    value: button.value
                });

                const wasPressed = lastState?.buttons.get(index)?.pressed || false;

                // Emit button press event
                if (button.pressed && !wasPressed) {
                    const event: GamepadButtonEvent = {
                        type: 'gamepadbutton',
                        timestamp: this.timer.now(),
                        gamepadIndex: i,
                        button: index,
                        pressed: true,
                        value: button.value
                    };
                    this.emitEvent(event);
                }

                // Emit button release event
                if (!button.pressed && wasPressed) {
                    const event: GamepadButtonEvent = {
                        type: 'gamepadbutton',
                        timestamp: this.timer.now(),
                        gamepadIndex: i,
                        button: index,
                        pressed: false,
                        value: button.value
                    };
                    this.emitEvent(event);
                }
            });

            // Check axis changes
            gamepad.axes.forEach((value, index) => {
                currentState.axes.set(index, value);

                const lastValue = lastState?.axes.get(index) || 0;

                // Emit axis change event (only if change is significant)
                if (Math.abs(value - lastValue) > GamepadInputAdapter.AXIS_DEADZONE_THRESHOLD) {
                    const event: GamepadAxisEvent = {
                        type: 'gamepadaxis',
                        timestamp: this.timer.now(),
                        gamepadIndex: i,
                        axis: index,
                        value
                    };
                    this.emitEvent(event);
                }
            });

            this.lastGamepadStates.set(i, currentState);
        }
    }

    /**
     * Get capabilities
     */
    getCapabilities(): InputCapabilities {
        return {
            keyboard: false,
            mouse: false,
            touch: false,
            gamepad: true
        };
    }

    /**
     * Dispose (cleanup)
     */
    dispose(): void {
        this.detach();
    }
}
