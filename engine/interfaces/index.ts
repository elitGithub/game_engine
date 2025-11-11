/**
 * Platform Abstraction Interfaces
 *
 * This module exports all platform abstraction interfaces.
 * These interfaces allow the engine to run on ANY platform
 * without hardcoding platform-specific dependencies.
 *
 * All adapters follow the SINGLETON pattern - one game =
 * one platform = one instance of each adapter.
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
 * // Engine receives platform via DI (singleton pattern)
 * const engine = new Engine({ platform, systems: { ... } });
 *
 * // Get platform adapters (singletons)
 * const renderContainer = platform.getRenderContainer();
 * const audioPlatform = platform.getAudioPlatform();
 * const inputAdapter = platform.getInputAdapter();
 * const storage = platform.getStorageAdapter();
 * ```
 */

// ============================================================================
// MASTER PLATFORM ADAPTER (SINGLETON)
// ============================================================================

export type {
    IPlatformAdapter,
    PlatformType,
    PlatformCapabilities,
    IAnimationProvider,
    INetworkProvider,
    IImageLoader
} from '@engine/interfaces/IPlatformAdapter';
export { requiresCapability } from '@engine/interfaces/IPlatformAdapter';

// ============================================================================
// RENDER CONTAINER (SINGLETON)
// ============================================================================

export type {
    IRenderContainer,
    IDomRenderContainer,
    ICanvasRenderContainer,
    IWebGLRenderContainer,
    IHeadlessRenderContainer,
    INativeRenderContainer,
    RenderContainerType
} from './IRenderContainer';
export {
    DomRenderContainer,
    CanvasRenderContainer,
    HeadlessRenderContainer,
    isDomRenderContainer,
    isCanvasRenderContainer,
    isWebGLRenderContainer,
    isHeadlessRenderContainer,
    isNativeRenderContainer
} from './IRenderContainer';

// ============================================================================
// AUDIO PLATFORM (SINGLETON)
// ============================================================================

export type {
    IAudioPlatform,
    IAudioContext,
    IAudioBuffer,
    IAudioSource,
    IAudioGain,
    IAudioDestination,
    AudioPlatformType,
    AudioContextState,
    AudioCapabilities,
    AudioFormat
} from './IAudioPlatform';
export { supportsAudioFormat } from './IAudioPlatform';
export { WebAudioPlatform } from '../platform/webaudio/WebAudioPlatform';
export { MockAudioPlatform } from '../platform/mock/MockAudioPlatform';

// ============================================================================
// INPUT ADAPTER (SINGLETON)
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
// TIMER PROVIDER (SINGLETON)
// ============================================================================

export type { ITimerProvider } from './ITimerProvider';

// ============================================================================
// DESIGN PRINCIPLES
// ============================================================================

/**
 * SINGLETON PATTERN
 *
 * All platform adapters follow the singleton pattern:
 * - One game = one platform configuration
 * - Platform owns and manages adapter instances
 * - get*() methods return same instance on multiple calls
 * - Lifecycle managed by platform (created once, disposed once)
 *
 * This ensures:
 * - Consistent platform state across engine
 * - No resource duplication
 * - Clear ownership and lifecycle
 * - Simpler API (no need to track instances)
 */

/**
 * TYPE SAFETY
 *
 * Containers use specific typed interfaces:
 * - IDomRenderContainer provides getElement(): HTMLElement
 * - ICanvasRenderContainer provides getCanvas(): HTMLCanvasElement
 * - Type guards available for safe casting
 *
 * Audio is fully abstracted:
 * - IAudioContext wraps platform audio (no Web Audio API coupling)
 * - WebAudioPlatform wraps browser implementation
 * - MockAudioPlatform for testing
 *
 * This ensures:
 * - Full type safety without platform coupling
 * - Works on ANY platform (browser, mobile, desktop, headless)
 * - Easy testing with mocks
 */

/**
 * IMPLEMENTATION GUIDE
 *
 * To implement a custom platform:
 *
 * 1. Implement IPlatformAdapter
 *    - Define platform type and capabilities
 *    - Implement singleton get*() methods
 *
 * 2. Implement IRenderContainer (if rendering supported)
 *    - Extend specific typed interface (IDomRenderContainer, etc.)
 *    - Provide type-safe access to native container
 *
 * 3. Implement IAudioPlatform (if audio supported)
 *    - Return IAudioContext (wrap native platform audio)
 *    - Or use WebAudioPlatform/MockAudioPlatform
 *
 * 4. Implement IInputAdapter (if input supported)
 *    - Translate platform events to EngineInputEvent
 *    - Handle attach/detach lifecycle
 *
 * 5. Use existing IStorageAdapter
 *    - Reuse LocalStorageAdapter, BackendAdapter, or create custom
 *
 * See docs/architecture/platform-implementation.md for detailed guide.
 */
