/**
 * Headless Platform Adapter
 *
 * Platform implementation for headless environments (Node.js, testing, CI/CD).
 * Provides mock/minimal implementations for all adapters.
 */

import type {
    IPlatformAdapter,
    PlatformType,
    PlatformCapabilities,
    IRenderContainer,
    IAudioPlatform,
    IInputAdapter,
    ITimerProvider
} from '@engine/interfaces';
import {
    MockAudioPlatform,
    MockInputAdapter
} from '@engine/interfaces';
import type { StorageAdapter } from '@engine/core/StorageAdapter';
import { InMemoryStorageAdapter } from '@engine/systems/InMemoryStorageAdapter';
import {HeadlessRenderContainer} from "@engine/interfaces/HeadlessRenderContainer";

/**
 * Headless platform configuration
 */
export interface HeadlessPlatformConfig {
    /**
     * Virtual screen width
     * Default: 800
     */
    width?: number;

    /**
     * Virtual screen height
     * Default: 600
     */
    height?: number;

    /**
     * Pixel ratio (only used for virtual screen calculations)
     * Default: 1.0
     */
    pixelRatio?: number;

    /**
     * Enable mock audio
     * Default: false (headless typically doesn't need audio)
     */
    audio?: boolean;

    /**
     * Enable mock input
     * Default: false (headless typically doesn't need input)
     */
    input?: boolean;

    /**
     * Storage key prefix for in-memory storage
     * Default: 'headless_'
     */
    storagePrefix?: string;

    /**
     * Timer implementation for dependency injection
     * Default: Node.js/browser setTimeout/clearTimeout/Date.now
     *
     * This allows complete platform independence and custom timer
     * implementations for testing (e.g., fake timers, manual time control)
     */
    timerImpl?: {
        setTimeout: (callback: () => void, ms: number) => unknown;
        clearTimeout: (id: unknown) => void;
        now: () => number;
    };
}

/**
 * HeadlessPlatformAdapter - Headless/testing implementation
 *
 * Singleton pattern: All adapters are created once and reused.
 *
 * Use cases:
 * - Unit testing
 * - Integration testing
 * - CI/CD pipelines
 * - Server-side game logic (no rendering)
 * - Headless game simulation
 *
 * Example:
 * ```typescript
 * const platform = new HeadlessPlatformAdapter({
 *     width: 1920,
 *     height: 1080,
 *     audio: false,  // No audio in tests
 *     input: true    // Mock input for testing
 * });
 *
 * const engine = new Engine({ platform, systems: { ... } });
 * ```
 */
export class HeadlessPlatformAdapter implements IPlatformAdapter {
    public readonly type: PlatformType = 'test';
    public readonly name = 'Headless Platform';
    public readonly version = '1.0.0';

    private config: {
        width: number;
        height: number;
        pixelRatio: number;
        audio: boolean;
        input: boolean;
        storagePrefix: string;
    };
    private timerImpl: {
        setTimeout: (callback: () => void, ms: number) => unknown;
        clearTimeout: (id: unknown) => void;
        now: () => number;
    };

    // Singletons
    private renderContainer: IRenderContainer | null = null;
    private audioPlatform: IAudioPlatform | null = null;
    private inputAdapter: IInputAdapter | null = null;
    private storageAdapter: InMemoryStorageAdapter | null = null;
    private timerProvider: ITimerProvider | null = null;

    constructor(config: HeadlessPlatformConfig = {}) {
        this.config = {
            width: config.width ?? 800,
            height: config.height ?? 600,
            pixelRatio: config.pixelRatio ?? 1.0,
            audio: config.audio ?? false,
            input: config.input ?? false,
            storagePrefix: config.storagePrefix ?? 'headless_'
        };

        // Default timer implementation (Node.js/browser compatible)
        this.timerImpl = config.timerImpl ?? {
            setTimeout: (cb, ms) => setTimeout(cb, ms),
            clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
            now: () => Date.now()
        };
    }

    // ========================================================================
    // RENDERING (SINGLETON)
    // ========================================================================

    getRenderContainer(): IRenderContainer {
        if (!this.renderContainer) {
            this.renderContainer = new HeadlessRenderContainer(
                this.config.width,
                this.config.height,
                this.config.pixelRatio
            );
        }
        return this.renderContainer;
    }

    // ========================================================================
    // AUDIO (SINGLETON)
    // ========================================================================

    getAudioPlatform(): IAudioPlatform | undefined {
        if (!this.config.audio) {
            return undefined;
        }

        if (!this.audioPlatform) {
            this.audioPlatform = new MockAudioPlatform();
        }

        return this.audioPlatform;
    }

    // ========================================================================
    // STORAGE (SINGLETON)
    // ========================================================================

    getStorageAdapter(): StorageAdapter {
        if (!this.storageAdapter) {
            this.storageAdapter = new InMemoryStorageAdapter(this.config.storagePrefix);
        }
        return this.storageAdapter;
    }

    // ========================================================================
    // INPUT (SINGLETON)
    // ========================================================================

    getInputAdapter(): IInputAdapter | undefined {
        if (!this.config.input) {
            return undefined;
        }

        if (!this.inputAdapter) {
            this.inputAdapter = new MockInputAdapter();
        }

        return this.inputAdapter;
    }

    // ========================================================================
    // TIMER (SINGLETON)
    // ========================================================================

    getTimerProvider(): ITimerProvider {
        if (!this.timerProvider) {
            this.timerProvider = {
                setTimeout: (callback: () => void, ms: number) => this.timerImpl.setTimeout(callback, ms),
                clearTimeout: (id: unknown) => this.timerImpl.clearTimeout(id),
                now: () => this.timerImpl.now()
            };
        }
        return this.timerProvider;
    }

    // ========================================================================
    // CAPABILITIES
    // ========================================================================

    getCapabilities(): PlatformCapabilities {
        return {
            rendering: true,      // Headless rendering (no visual output)
            audio: this.config.audio,
            input: this.config.input,
            storage: true,        // In-memory storage always available
            network: false,       // Headless has no network provider
            realtime: false,      // Headless has no animation frame provider
            imageLoading: false   // Headless has no image loader
        };
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    async initialize(): Promise<void> {
        // Headless platform doesn't need async initialization
    }

    dispose(): void {
        // Dispose audio platform
        if (this.audioPlatform) {
            this.audioPlatform.dispose();
            this.audioPlatform = null;
        }

        // Dispose input adapter
        if (this.inputAdapter) {
            this.inputAdapter.detach();
            this.inputAdapter = null;
        }

        // Clear storage
        if (this.storageAdapter) {
            this.storageAdapter.clear();
            this.storageAdapter = null;
        }

        // Clear singletons
        this.renderContainer = null;
        this.timerProvider = null;
    }

    // ========================================================================
    // TESTING HELPERS
    // ========================================================================

    /**
     * Get in-memory storage (for testing)
     * Allows direct access to storage for test assertions
     */
    getInMemoryStorage(): InMemoryStorageAdapter {
        return this.getStorageAdapter() as InMemoryStorageAdapter;
    }

    /**
     * Get mock input adapter (for testing)
     * Allows simulating input events in tests
     */
    getMockInputAdapter(): MockInputAdapter | undefined {
        return this.inputAdapter as MockInputAdapter | undefined;
    }

    /**
     * Reset platform to initial state (for testing)
     * Useful for cleaning up between tests
     */
    reset(): void {
        this.dispose();
        // Reinitialize singletons on next get
    }
}

// Re-export for backward compatibility
export { InMemoryStorageAdapter } from '../systems/InMemoryStorageAdapter';
