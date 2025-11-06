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

/**
 * BrowserContainer - Browser/DOM implementation
 */
export class BrowserContainer implements PlatformContainer {
    constructor(private element: HTMLElement) {}

    getDomElement(): HTMLElement {
        return this.element;
    }

    getCanvasElement(): HTMLCanvasElement | undefined {
        return this.element instanceof HTMLCanvasElement
            ? this.element
            : undefined;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.element.clientWidth,
            height: this.element.clientHeight
        };
    }
}

/**
 * NativeContainer - Mobile/native implementation example
 */
export class NativeContainer implements PlatformContainer {
    constructor(private view: any) {}

    getNativeView(): any {
        return this.view;
    }

    getDimensions(): { width: number; height: number } {
        // Platform-specific dimension retrieval
        return {
            width: this.view.width || 0,
            height: this.view.height || 0
        };
    }
}

/**
 * HeadlessContainer - Server/testing implementation
 */
export class HeadlessContainer implements PlatformContainer {
    constructor(private width: number = 800, private height: number = 600) {}

    getDimensions(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }
}