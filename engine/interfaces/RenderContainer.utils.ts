// ============================================================================
// TYPE GUARDS
// ============================================================================

import {
    ICanvasRenderContainer, IDomRenderContainer,
    IHeadlessRenderContainer, INativeRenderContainer,
    IRenderContainer,
    IWebGLRenderContainer
} from "@engine/interfaces/IRenderContainer";

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
