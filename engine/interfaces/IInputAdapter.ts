/**
 * Input Adapter Abstraction
 *
 * Formalizes the existing DomInputAdapter pattern into a
 * platform-agnostic interface.
 *
 * Input adapters translate platform-specific input events
 * into engine-agnostic EngineInputEvent objects.
 */

import type { EngineInputEvent } from '../core/InputEvents';
import type { IRenderContainer } from './IRenderContainer';

/**
 * Input adapter type
 */
export type InputAdapterType =
    | 'dom'           // Browser keyboard/mouse
    | 'canvas'        // Canvas-based input
    | 'gamepad'       // Gamepad/controller
    | 'touch'         // Mobile touch
    | 'native'        // Platform-native input
    | 'mock';         // Testing

/**
 * IInputAdapter - Platform-agnostic input interface
 *
 * Input adapters are responsible for:
 * 1. Listening to platform-specific input events
 * 2. Translating them to engine-agnostic EngineInputEvent
 * 3. Forwarding to InputManager via callback
 * 4. Managing lifecycle (attach/detach)
 *
 * Example:
 * ```typescript
 * class GamepadInputAdapter implements IInputAdapter {
 *     attach(container: IRenderContainer): boolean {
 *         window.addEventListener('gamepadconnected', ...);
 *         return true;
 *     }
 *
 *     detach(): void {
 *         window.removeEventListener('gamepadconnected', ...);
 *     }
 * }
 *
 * // In InputManager
 * const adapter = platform.createInputAdapter();
 * adapter.onEvent((event) => inputManager.processEvent(event));
 * adapter.attach(renderContainer);
 * ```
 */
export interface IInputAdapter {
    /**
     * Get adapter type
     */
    getType(): InputAdapterType;

    /**
     * Attach adapter to render container
     *
     * Starts listening for platform-specific input events.
     * Returns true if successfully attached, false if not supported.
     *
     * @param container - Render container to attach to
     * @param options - Platform-specific attachment options
     */
    attach(container: IRenderContainer, options?: InputAttachOptions): boolean;

    /**
     * Detach adapter
     *
     * Stops listening for input events and cleans up.
     */
    detach(): void;

    /**
     * Register event handler
     *
     * Called by InputManager to receive translated engine events.
     *
     * @param handler - Function to call when input event occurs
     */
    onEvent(handler: InputEventHandler): void;

    /**
     * Enable/disable input
     *
     * When disabled, adapter should not fire events (but keeps listeners attached)
     */
    setEnabled?(enabled: boolean): void;

    /**
     * Check if currently attached
     */
    isAttached(): boolean;

    /**
     * Get adapter capabilities
     */
    getCapabilities?(): InputCapabilities;
}

/**
 * Input event handler callback
 */
export type InputEventHandler = (event: EngineInputEvent) => void;

/**
 * Input attachment options
 */
export interface InputAttachOptions {
    /**
     * Auto-focus the container
     */
    focus?: boolean;

    /**
     * Set tabindex (for keyboard input)
     */
    tabindex?: string;

    /**
     * Prevent default browser behavior
     */
    preventDefault?: boolean;

    /**
     * Capture or bubble phase
     */
    capture?: boolean;

    /**
     * Platform-specific options
     */
    custom?: Record<string, unknown>;
}

/**
 * Input capabilities
 */
export interface InputCapabilities {
    /**
     * Supports keyboard input
     */
    keyboard: boolean;

    /**
     * Supports mouse input
     */
    mouse: boolean;

    /**
     * Supports touch input
     */
    touch: boolean;

    /**
     * Supports gamepad input
     */
    gamepad: boolean;

    /**
     * Number of simultaneous touch points
     */
    maxTouchPoints?: number;

    /**
     * Supports pressure-sensitive input
     */
    pressure?: boolean;

    /**
     * Additional capabilities
     */
    custom?: Record<string, boolean>;
}

/**
 * Base input adapter - provides common functionality
 */
export abstract class BaseInputAdapter implements IInputAdapter {
    protected eventHandler: InputEventHandler | null = null;
    protected attached: boolean = false;
    protected enabled: boolean = true;

    abstract getType(): InputAdapterType;
    abstract attach(container: IRenderContainer, options?: InputAttachOptions): boolean;
    abstract detach(): void;

    onEvent(handler: InputEventHandler): void {
        this.eventHandler = handler;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isAttached(): boolean {
        return this.attached;
    }

    /**
     * Helper to emit events (only if enabled and handler exists)
     */
    protected emitEvent(event: EngineInputEvent): void {
        if (this.enabled && this.eventHandler) {
            this.eventHandler(event);
        }
    }
}

/**
 * Mock Input Adapter - For testing
 */
export class MockInputAdapter extends BaseInputAdapter {
    getType(): InputAdapterType {
        return 'mock';
    }

    attach(container: IRenderContainer, options?: InputAttachOptions): boolean {
        this.attached = true;
        return true;
    }

    detach(): void {
        this.attached = false;
    }

    getCapabilities(): InputCapabilities {
        return {
            keyboard: true,
            mouse: true,
            touch: false,
            gamepad: false
        };
    }

    /**
     * Simulate input event (for testing)
     */
    simulateEvent(event: EngineInputEvent): void {
        this.emitEvent(event);
    }
}

/**
 * Helper to combine multiple input adapters
 */
export class CompositeInputAdapter extends BaseInputAdapter {
    private adapters: IInputAdapter[] = [];

    constructor(...adapters: IInputAdapter[]) {
        super();
        this.adapters = adapters;

        // Forward events from all child adapters
        adapters.forEach(adapter => {
            adapter.onEvent((event) => this.emitEvent(event));
        });
    }

    getType(): InputAdapterType {
        return 'composite' as InputAdapterType;
    }

    attach(container: IRenderContainer, options?: InputAttachOptions): boolean {
        let anyAttached = false;
        this.adapters.forEach(adapter => {
            if (adapter.attach(container, options)) {
                anyAttached = true;
            }
        });
        this.attached = anyAttached;
        return anyAttached;
    }

    detach(): void {
        this.adapters.forEach(adapter => adapter.detach());
        this.attached = false;
    }

    setEnabled(enabled: boolean): void {
        super.setEnabled(enabled);
        this.adapters.forEach(adapter => adapter.setEnabled?.(enabled));
    }

    getCapabilities(): InputCapabilities {
        // Merge capabilities from all adapters
        const merged: InputCapabilities = {
            keyboard: false,
            mouse: false,
            touch: false,
            gamepad: false
        };

        this.adapters.forEach(adapter => {
            const caps = adapter.getCapabilities?.();
            if (caps) {
                merged.keyboard = merged.keyboard || caps.keyboard;
                merged.mouse = merged.mouse || caps.mouse;
                merged.touch = merged.touch || caps.touch;
                merged.gamepad = merged.gamepad || caps.gamepad;
                if (caps.maxTouchPoints) {
                    merged.maxTouchPoints = Math.max(
                        merged.maxTouchPoints || 0,
                        caps.maxTouchPoints
                    );
                }
            }
        });

        return merged;
    }
}
