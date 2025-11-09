/**
 * Render Container Abstraction
 *
 * Platform-agnostic container for renderer initialization.
 * Replaces hardcoded HTMLElement dependency in IRenderer.
 */

/**
 * Container type identifier
 */
export type RenderContainerType = 'dom' | 'canvas' | 'webgl' | 'native' | 'headless' | 'custom';

/**
 * IRenderContainer - Platform-agnostic render target
 *
 * This abstraction allows renderers to initialize on ANY platform,
 * not just DOM/HTMLElement.
 *
 * Each renderer type (DOM, Canvas, WebGL, etc.) casts to the
 * appropriate native type it needs.
 *
 * Example:
 * ```typescript
 * class DomRenderer implements IRenderer {
 *     init(container: IRenderContainer): void {
 *         if (container.getType() !== 'dom') {
 *             throw new Error('DomRenderer requires DOM container');
 *         }
 *
 *         const element = container.getNativeContainer() as HTMLElement;
 *         // Now we can use the HTMLElement
 *     }
 * }
 * ```
 */
export interface IRenderContainer {
    /**
     * Container type - what kind of rendering target this is
     */
    getType(): RenderContainerType;

    /**
     * Get the platform-specific native container
     *
     * - DOM: Returns HTMLElement
     * - Canvas: Returns HTMLCanvasElement
     * - WebGL: Returns HTMLCanvasElement with WebGL context
     * - Native: Returns platform view (UIView, View, etc.)
     * - Headless: Returns mock container or dimensions object
     * - Custom: Returns user-defined container
     *
     * Renderers cast this to the appropriate type based on getType()
     */
    getNativeContainer(): unknown;

    /**
     * Get container dimensions
     *
     * All containers MUST provide dimensions
     */
    getDimensions(): {
        width: number;
        height: number;
    };

    /**
     * Set container dimensions (if supported)
     *
     * Returns false if container doesn't support resizing
     */
    setDimensions?(width: number, height: number): boolean;

    /**
     * Get device pixel ratio (for high-DPI displays)
     *
     * Defaults to 1.0 if not supported
     */
    getPixelRatio?(): number;

    /**
     * Request animation frame (if supported)
     *
     * Returns cancel function, or undefined if not supported
     */
    requestAnimationFrame?(callback: () => void): (() => void) | undefined;
}

/**
 * DOM Container - For DOM-based renderers
 */
export class DomRenderContainer implements IRenderContainer {
    constructor(private element: HTMLElement) {}

    getType(): RenderContainerType {
        return 'dom';
    }

    getNativeContainer(): HTMLElement {
        return this.element;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.element.clientWidth,
            height: this.element.clientHeight
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        return true;
    }

    getPixelRatio(): number {
        return window.devicePixelRatio || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = window.requestAnimationFrame(callback);
        return () => window.cancelAnimationFrame(id);
    }
}

/**
 * Canvas Container - For Canvas-based renderers
 */
export class CanvasRenderContainer implements IRenderContainer {
    constructor(private canvas: HTMLCanvasElement) {}

    getType(): RenderContainerType {
        return 'canvas';
    }

    getNativeContainer(): HTMLCanvasElement {
        return this.canvas;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.canvas.width = width;
        this.canvas.height = height;
        return true;
    }

    getPixelRatio(): number {
        return window.devicePixelRatio || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = window.requestAnimationFrame(callback);
        return () => window.cancelAnimationFrame(id);
    }
}

/**
 * Headless Container - For testing/server-side rendering
 */
export class HeadlessRenderContainer implements IRenderContainer {
    constructor(
        private width: number = 800,
        private height: number = 600,
        private pixelRatio: number = 1.0
    ) {}

    getType(): RenderContainerType {
        return 'headless';
    }

    getNativeContainer(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.width = width;
        this.height = height;
        return true;
    }

    getPixelRatio(): number {
        return this.pixelRatio;
    }

    // No requestAnimationFrame in headless
}

/**
 * Helper to check if container is of specific type
 */
export function isContainerType(
    container: IRenderContainer,
    type: RenderContainerType
): boolean {
    return container.getType() === type;
}

/**
 * Helper to safely cast container to native type
 */
export function getNativeContainer<T>(
    container: IRenderContainer,
    expectedType: RenderContainerType
): T {
    if (container.getType() !== expectedType) {
        throw new Error(
            `Expected ${expectedType} container, got ${container.getType()}`
        );
    }
    return container.getNativeContainer() as T;
}
