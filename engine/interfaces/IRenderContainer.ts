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
// CONCRETE IMPLEMENTATIONS (re-exported from separate files)
// ============================================================================

export { DomRenderContainer } from '@engine/platform/browser/DomRenderContainer';
export { CanvasRenderContainer } from '@engine/platform/browser/CanvasRenderContainer';
export { HeadlessRenderContainer } from '@engine/interfaces/HeadlessRenderContainer';

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
