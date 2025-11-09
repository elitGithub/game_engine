/**
 * Render Container Abstraction
 *
 * Platform-agnostic container for renderer initialization.
 * Uses specific typed interfaces for each container type to ensure type safety.
 */

/**
 * Container type identifier
 */
export type RenderContainerType = 'dom' | 'canvas' | 'webgl' | 'native' | 'headless' | 'custom';

/**
 * IRenderContainer - Base interface for all render containers
 *
 * This is the base interface. Renderers should depend on specific
 * typed interfaces (IDomRenderContainer, ICanvasRenderContainer, etc.)
 * which provide type-safe access to native containers.
 *
 * DO NOT use this interface directly in renderer implementations.
 * Use the specific typed interfaces below.
 */
export interface IRenderContainer {
    /**
     * Container type - what kind of rendering target this is
     */
    getType(): RenderContainerType;

    /**
     * Get container dimensions
     * All containers MUST provide dimensions
     */
    getDimensions(): {
        width: number;
        height: number;
    };

    /**
     * Set container dimensions (if supported)
     * Returns false if container doesn't support resizing
     */
    setDimensions?(width: number, height: number): boolean;

    /**
     * Get device pixel ratio (for high-DPI displays)
     * Defaults to 1.0 if not supported
     */
    getPixelRatio?(): number;
}

// ============================================================================
// TYPED CONTAINER INTERFACES
// ============================================================================

/**
 * DOM Container - For DOM-based renderers
 *
 * Type-safe access to HTMLElement.
 * Use this in DOM renderer implementations.
 */
export interface IDomRenderContainer extends IRenderContainer {
    getType(): 'dom';

    /**
     * Get the DOM element - type-safe!
     */
    getElement(): HTMLElement;

    /**
     * Request animation frame (browser-specific)
     */
    requestAnimationFrame(callback: () => void): () => void;
}

/**
 * Canvas Container - For Canvas 2D renderers
 *
 * Type-safe access to HTMLCanvasElement and 2D context.
 * Use this in Canvas renderer implementations.
 */
export interface ICanvasRenderContainer extends IRenderContainer {
    getType(): 'canvas';

    /**
     * Get the canvas element - type-safe!
     */
    getCanvas(): HTMLCanvasElement;

    /**
     * Get 2D rendering context - type-safe!
     */
    getContext(): CanvasRenderingContext2D;

    /**
     * Request animation frame (browser-specific)
     */
    requestAnimationFrame(callback: () => void): () => void;
}

/**
 * WebGL Container - For WebGL renderers
 *
 * Type-safe access to HTMLCanvasElement and WebGL context.
 * Use this in WebGL renderer implementations.
 */
export interface IWebGLRenderContainer extends IRenderContainer {
    getType(): 'webgl';

    /**
     * Get the canvas element - type-safe!
     */
    getCanvas(): HTMLCanvasElement;

    /**
     * Get WebGL rendering context - type-safe!
     */
    getContext(): WebGLRenderingContext;

    /**
     * Request animation frame (browser-specific)
     */
    requestAnimationFrame(callback: () => void): () => void;
}

/**
 * Headless Container - For testing/server-side rendering
 *
 * No native container, just dimensions.
 * Use this for headless renderer implementations.
 */
export interface IHeadlessRenderContainer extends IRenderContainer {
    getType(): 'headless';

    /**
     * No native element - returns null
     */
    getElement(): null;
}

/**
 * Native Container - For mobile/native platforms
 *
 * Platform-specific view object.
 * Actual type depends on platform (UIView, View, etc.)
 */
export interface INativeRenderContainer<TNative = unknown> extends IRenderContainer {
    getType(): 'native';

    /**
     * Get platform-specific native view
     * Type parameter should be platform's view type
     */
    getNativeView(): TNative;
}

// ============================================================================
// CONCRETE IMPLEMENTATIONS
// ============================================================================

/**
 * DOM Container Implementation
 */
export class DomRenderContainer implements IDomRenderContainer {
    constructor(private element: HTMLElement) {}

    getType(): 'dom' {
        return 'dom';
    }

    getElement(): HTMLElement {
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
 * Canvas Container Implementation
 */
export class CanvasRenderContainer implements ICanvasRenderContainer {
    private context: CanvasRenderingContext2D;

    constructor(private canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.context = ctx;
    }

    getType(): 'canvas' {
        return 'canvas';
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    getContext(): CanvasRenderingContext2D {
        return this.context;
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
 * Headless Container Implementation
 */
export class HeadlessRenderContainer implements IHeadlessRenderContainer {
    constructor(
        private width: number = 800,
        private height: number = 600,
        private pixelRatio: number = 1.0
    ) {}

    getType(): 'headless' {
        return 'headless';
    }

    getElement(): null {
        return null;
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
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for DOM container
 */
export function isDomRenderContainer(
    container: IRenderContainer
): container is IDomRenderContainer {
    return container.getType() === 'dom';
}

/**
 * Type guard for Canvas container
 */
export function isCanvasRenderContainer(
    container: IRenderContainer
): container is ICanvasRenderContainer {
    return container.getType() === 'canvas';
}

/**
 * Type guard for WebGL container
 */
export function isWebGLRenderContainer(
    container: IRenderContainer
): container is IWebGLRenderContainer {
    return container.getType() === 'webgl';
}

/**
 * Type guard for Headless container
 */
export function isHeadlessRenderContainer(
    container: IRenderContainer
): container is IHeadlessRenderContainer {
    return container.getType() === 'headless';
}

/**
 * Type guard for Native container
 */
export function isNativeRenderContainer(
    container: IRenderContainer
): container is INativeRenderContainer {
    return container.getType() === 'native';
}
