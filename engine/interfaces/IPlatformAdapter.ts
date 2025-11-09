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

import type { IRenderContainer } from './IRenderContainer';
import type { IAudioPlatform } from './IAudioPlatform';
import type { IStorageAdapter } from '../core/StorageAdapter';
import type { IInputAdapter } from './IInputAdapter';

/**
 * Platform type identifier
 */
export type PlatformType = 'browser' | 'node' | 'mobile' | 'test' | 'custom';

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
    // RENDERING
    // ========================================================================

    /**
     * Get render container for renderer initialization
     *
     * Returns undefined if platform doesn't support rendering
     * (e.g., headless server)
     */
    getRenderContainer?(): IRenderContainer | undefined;

    // ========================================================================
    // AUDIO
    // ========================================================================

    /**
     * Get audio platform adapter
     *
     * Returns undefined if platform doesn't support audio
     * (e.g., headless server, or audio disabled)
     */
    getAudioPlatform?(): IAudioPlatform | undefined;

    // ========================================================================
    // STORAGE
    // ========================================================================

    /**
     * Get storage adapter for save/load functionality
     *
     * All platforms MUST provide storage (even if in-memory)
     */
    getStorageAdapter(): IStorageAdapter;

    // ========================================================================
    // INPUT
    // ========================================================================

    /**
     * Create input adapter for this platform
     *
     * Returns undefined if platform doesn't support input
     * (e.g., headless server)
     *
     * Input adapter lifecycle is managed by InputManager
     */
    createInputAdapter?(): IInputAdapter | undefined;

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
 */
export interface PlatformCapabilities {
    /**
     * Can render graphics
     */
    rendering: boolean;

    /**
     * Can play audio
     */
    audio: boolean;

    /**
     * Can receive input
     */
    input: boolean;

    /**
     * Can persist data
     */
    storage: boolean;

    /**
     * Can access network
     */
    network: boolean;

    /**
     * Supports real-time features (game loop, animation)
     */
    realtime: boolean;

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
