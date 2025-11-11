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
     * @param container - Render container to attach to (optional for global input like gamepad)
     * @param options - Platform-specific attachment options
     */
    attach(container?: IRenderContainer, options?: InputAttachOptions): boolean;

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

// Re-export concrete implementations from their own files
export { BaseInputAdapter } from '@engine/input/BaseInputAdapter';
export { MockInputAdapter } from '@engine/input/MockInputAdapter';
export { CompositeInputAdapter } from '@engine/input/CompositeInputAdapter';
