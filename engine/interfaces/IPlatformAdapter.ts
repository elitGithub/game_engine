/**
 * Platform Abstraction Layer - Master Interface
 *
 * This file defines the core abstraction that allows the engine to run
 * on ANY platform without hardcoding platform-specific dependencies.
 *
 * Platform Types:
 * - Browser: Standard web browser (Chrome, Firefox, Safari, etc.)
 * - Node: Node.js/Electron (headless or with native rendering)
 * - Mobile: React Native, Capacitor, Cordova
 * - Test: Mock platform for testing
 * - Custom: User-defined platform
 */

import type {IRenderContainer} from '@engine/interfaces/IRenderContainer';
import type {IAudioPlatform} from '@engine/interfaces/IAudioPlatform';
import type {StorageAdapter} from '@engine/core/StorageAdapter';
import type {IInputAdapter} from '@engine/interfaces/IInputAdapter';
import type {ITimerProvider} from '@engine/interfaces/ITimerProvider';

/**
 * Platform type identifier
 */
export type PlatformType = 'browser' | 'node' | 'mobile' | 'test' | 'custom';

/**
 * Animation frame provider interface
 *
 * Provides requestAnimationFrame/cancelAnimationFrame abstraction
 * for platforms that support real-time rendering (browsers).
 *
 * Headless/testing platforms should return undefined from
 * getAnimationProvider() and use timer-based game loop instead.
 */
export interface IAnimationProvider {
    /**
     * Request animation frame for next render cycle
     * @returns Handle that can be passed to cancelAnimationFrame
     */
    requestAnimationFrame(callback: FrameRequestCallback): number;

    /**
     * Cancel a pending animation frame request
     * @param handle Handle returned from requestAnimationFrame
     */
    cancelAnimationFrame(handle: number): void;

    /**
     * Get device pixel ratio for high-DPI displays
     * @returns Pixel ratio (typically 1.0 for standard displays, 2.0+ for retina)
     */
    getDevicePixelRatio(): number;
}

/**
 * Network provider interface
 *
 * Provides fetch API abstraction for platforms that support
 * network access (browsers, Node.js with node-fetch).
 *
 * Headless/testing platforms should return undefined from
 * getNetworkProvider() if network access is not available.
 */
export interface INetworkProvider {
    /**
     * Fetch a resource from the network
     * @param url URL to fetch
     * @param options Fetch options (method, headers, body, etc.)
     * @returns Promise resolving to Response
     */
    fetch(url: string, options?: RequestInit): Promise<Response>;
}

/**
 * Image loader interface
 *
 * Provides image loading abstraction for platforms that support
 * image loading (browsers).
 *
 * Headless/testing platforms should return undefined from
 * getImageLoader() if image loading is not supported.
 */
export interface IImageLoader {
    /**
     * Load an image from a source URL
     * @param src Image source URL
     * @returns Promise resolving to loaded image element
     */
    loadImage(src: string): Promise<HTMLImageElement>;
}

/**
 * IPlatformAdapter - Master platform abstraction
 *
 * Platforms implement this interface to provide all platform-specific
 * functionality the engine needs. The engine core never accesses
 * globals like `window`, `document`, or platform-specific APIs directly.
 *
 * Example Usage:
 * ```typescript
 * // Browser platform
 * const platform = new BrowserPlatformAdapter({
 *   containerElement: document.getElementById('game')
 * });
 *
 * // Headless platform
 * const platform = new HeadlessPlatformAdapter({
 *   width: 800,
 *   height: 600
 * });
 *
 * // Engine receives platform via DI
 * const engine = new Engine({
 *   platform,
 *   systems: { ... }
 * });
 * ```
 */
export interface IPlatformAdapter {
    /**
     * Platform type identifier
     */
    readonly type: PlatformType;

    /**
     * Platform name (e.g., 'Chrome Browser', 'Node.js v18', 'React Native')
     */
    readonly name: string;

    /**
     * Platform version (optional)
     */
    readonly version?: string;

    // ========================================================================
    // RENDERING (SINGLETON)
    // ========================================================================

    /**
     * Get render container for renderer initialization (singleton)
     *
     * Returns the same container instance on multiple calls.
     * Returns undefined if platform doesn't support rendering
     * (e.g., headless server)
     */
    getRenderContainer?(): IRenderContainer | undefined;

    // ========================================================================
    // AUDIO (SINGLETON)
    // ========================================================================

    /**
     * Get audio platform adapter (singleton)
     *
     * Returns the same audio platform instance on multiple calls.
     * Returns undefined if platform doesn't support audio
     * (e.g., headless server, or audio disabled)
     */
    getAudioPlatform?(): IAudioPlatform | undefined;

    // ========================================================================
    // STORAGE (SINGLETON)
    // ========================================================================

    /**
     * Get storage adapter for save/load functionality (singleton)
     *
     * Returns the same storage adapter instance on multiple calls.
     * All platforms MUST provide storage (even if in-memory)
     */
    getStorageAdapter(): StorageAdapter;

    // ========================================================================
    // INPUT (SINGLETON)
    // ========================================================================

    /**
     * Get input adapter for this platform (singleton)
     *
     * Returns the same input adapter instance on multiple calls.
     * Returns undefined if platform doesn't support input
     * (e.g., headless server)
     *
     * Input adapter lifecycle is managed by platform, but attachment
     * is handled by InputManager.
     */
    getInputAdapter?(): IInputAdapter | undefined;

    // ========================================================================
    // TIMER (SINGLETON)
    // ========================================================================

    /**
     * Get timer provider for this platform (singleton)
     *
     * Returns the same timer provider instance on multiple calls.
     * All platforms MUST provide timer functionality.
     *
     * Used for scheduling callbacks with setTimeout/clearTimeout abstraction.
     */
    getTimerProvider(): ITimerProvider;

    // ========================================================================
    // ANIMATION (SINGLETON, OPTIONAL)
    // ========================================================================

    /**
     * Get animation frame provider (singleton, optional)
     *
     * Returns the same animation provider instance on multiple calls.
     * Returns undefined if platform doesn't support requestAnimationFrame
     * (e.g., headless server, testing environments).
     *
     * Browser platforms should implement this for smooth 60fps rendering.
     * Headless platforms should return undefined and use timer-based loop.
     */
    getAnimationProvider?(): IAnimationProvider | undefined;

    // ========================================================================
    // NETWORK (SINGLETON, OPTIONAL)
    // ========================================================================

    /**
     * Get network provider (singleton, optional)
     *
     * Returns the same network provider instance on multiple calls.
     * Returns undefined if platform doesn't support network access
     * (e.g., headless server without network, testing environments).
     */
    getNetworkProvider?(): INetworkProvider | undefined;

    // ========================================================================
    // IMAGE LOADING (SINGLETON, OPTIONAL)
    // ========================================================================

    /**
     * Get image loader (singleton, optional)
     *
     * Returns the same image loader instance on multiple calls.
     * Returns undefined if platform doesn't support image loading
     * (e.g., headless server, testing environments).
     */
    getImageLoader?(): IImageLoader | undefined;

    // ========================================================================
    // PLATFORM CAPABILITIES
    // ========================================================================

    /**
     * Query platform capabilities
     */
    getCapabilities(): PlatformCapabilities;

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Initialize platform (if needed)
     *
     * Called once when engine initializes.
     * Use for any platform-specific setup.
     */
    initialize?(): Promise<void> | void;

    /**
     * Dispose platform resources
     *
     * Called when engine is destroyed.
     * Clean up platform-specific resources.
     */
    dispose?(): void;
}

/**
 * Platform capabilities - what features are available
 *
 * This interface contains ONLY boolean flags that indicate what
 * capabilities the platform supports. It does NOT contain method
 * implementations - those are provided through separate provider
 * interfaces (IAnimationProvider, INetworkProvider, etc.).
 *
 * This design follows the Interface Segregation Principle and
 * prevents platforms from being forced to implement methods they
 * cannot support.
 */
export interface PlatformCapabilities {
    /**
     * Can render graphics
     * If true, getRenderContainer() should return a valid container
     */
    rendering: boolean;

    /**
     * Can play audio
     * If true, getAudioPlatform() should return a valid audio platform
     */
    audio: boolean;

    /**
     * Can receive input
     * If true, getInputAdapter() should return a valid input adapter
     */
    input: boolean;

    /**
     * Can persist data
     * Always true - all platforms must provide storage (even if in-memory)
     */
    storage: boolean;

    /**
     * Can access network
     * If true, getNetworkProvider() should return a valid network provider
     */
    network: boolean;

    /**
     * Supports real-time features (requestAnimationFrame)
     * If true, getAnimationProvider() should return a valid animation provider
     */
    realtime: boolean;

    /**
     * Supports image loading
     * If true, getImageLoader() should return a valid image loader
     */
    imageLoading: boolean;

    /**
     * Additional platform-specific capabilities
     */
    custom?: Record<string, boolean>;
}

/**
 * Helper to check if platform supports a capability
 */
export function requiresCapability(
    platform: IPlatformAdapter,
    capability: keyof PlatformCapabilities
): void {
    if (!platform.getCapabilities()[capability]) {
        throw new Error(
            `Platform '${platform.name}' does not support ${capability}`
        );
    }
}
