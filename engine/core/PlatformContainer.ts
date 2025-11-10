// engine/core/PlatformContainer.ts

/**
 * PlatformContainer - Abstract interface for platform-specific rendering targets
 *
 * Different platforms implement different subsets of this interface.
 * Systems and adapters check for capabilities they need.
 *
 * Examples:
 * - Browser: provides getDomElement() and/or getCanvasElement()
 * - Mobile: provides getNativeView()
 * - Server: provides nothing (headless)
 */
export interface PlatformContainer {
    /**
     * Get DOM element for browser-based rendering/input
     * Returns undefined if platform doesn't support DOM
     */
    getDomElement?(): HTMLElement;

    /**
     * Get Canvas element for canvas-based rendering
     * Returns undefined if platform doesn't support Canvas
     */
    getCanvasElement?(): HTMLCanvasElement | undefined ;

    /**
     * Get native view for mobile platforms
     * Returns undefined if not a native platform
     */
    getNativeView?(): any;

    /**
     * Get generic container dimensions (platform-agnostic)
     */
    getDimensions?(): { width: number; height: number };
}

// Concrete implementations (re-exported from separate files)
export { BrowserContainer } from './BrowserContainer';
export { NativeContainer } from './NativeContainer';
export { HeadlessContainer } from './HeadlessContainer';