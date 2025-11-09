/**
 * Platform Abstraction Interfaces
 *
 * This module exports all platform abstraction interfaces.
 * These interfaces allow the engine to run on ANY platform
 * without hardcoding platform-specific dependencies.
 *
 * Usage:
 * ```typescript
 * import {
 *     IPlatformAdapter,
 *     BrowserPlatformAdapter,
 *     HeadlessPlatformAdapter
 * } from './engine/interfaces';
 *
 * // Browser
 * const platform = new BrowserPlatformAdapter({
 *     containerElement: document.getElementById('game')
 * });
 *
 * // Or headless
 * const platform = new HeadlessPlatformAdapter();
 *
 * // Engine receives platform via DI
 * const engine = new Engine({ platform, systems: { ... } });
 * ```
 */

// ============================================================================
// MASTER PLATFORM ADAPTER
// ============================================================================

export type { IPlatformAdapter, PlatformType, PlatformCapabilities } from './IPlatformAdapter';
export { requiresCapability } from './IPlatformAdapter';

// ============================================================================
// RENDER CONTAINER
// ============================================================================

export type { IRenderContainer, RenderContainerType } from './IRenderContainer';
export {
    DomRenderContainer,
    CanvasRenderContainer,
    HeadlessRenderContainer,
    isContainerType,
    getNativeContainer
} from './IRenderContainer';

// ============================================================================
// AUDIO PLATFORM
// ============================================================================

export type {
    IAudioPlatform,
    AudioPlatformType,
    AudioContextState,
    AudioCapabilities,
    AudioFormat
} from './IAudioPlatform';
export {
    WebAudioPlatform,
    MockAudioPlatform,
    supportsAudioFormat
} from './IAudioPlatform';

// ============================================================================
// INPUT ADAPTER
// ============================================================================

export type {
    IInputAdapter,
    InputAdapterType,
    InputEventHandler,
    InputAttachOptions,
    InputCapabilities
} from './IInputAdapter';
export {
    BaseInputAdapter,
    MockInputAdapter,
    CompositeInputAdapter
} from './IInputAdapter';

// ============================================================================
// IMPLEMENTATION REFERENCE
// ============================================================================

/**
 * To implement a custom platform:
 *
 * 1. Implement IPlatformAdapter
 * 2. Implement IRenderContainer (if rendering supported)
 * 3. Implement IAudioPlatform (if audio supported)
 * 4. Implement IInputAdapter (if input supported)
 * 5. Use existing IStorageAdapter
 *
 * See docs/architecture/platform-implementation.md for details.
 */
