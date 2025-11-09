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
    IInputAdapter
} from '../interfaces';
import {
    HeadlessRenderContainer,
    MockAudioPlatform,
    MockInputAdapter
} from '../interfaces';
import type { StorageAdapter } from '../core/StorageAdapter';

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
     * Pixel ratio
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
}

/**
 * In-memory storage adapter for headless environments
 */
class InMemoryStorageAdapter implements StorageAdapter {
    private storage = new Map<string, string>();

    constructor(private prefix: string = 'headless_') {}

    async save(slotId: string, data: string): Promise<boolean> {
        try {
            this.storage.set(this.prefix + slotId, data);
            return true;
        } catch {
            return false;
        }
    }

    async load(slotId: string): Promise<string | null> {
        return this.storage.get(this.prefix + slotId) || null;
    }

    async delete(slotId: string): Promise<boolean> {
        try {
            this.storage.delete(this.prefix + slotId);
            return true;
        } catch {
            return false;
        }
    }

    async list(): Promise<import('../core/StorageAdapter').SaveSlotMetadata[]> {
        const saves: import('../core/StorageAdapter').SaveSlotMetadata[] = [];

        for (const [key, data] of this.storage.entries()) {
            if (key.startsWith(this.prefix)) {
                const slotId = key.substring(this.prefix.length);
                try {
                    const parsed = JSON.parse(data);
                    saves.push({
                        slotId,
                        timestamp: parsed.timestamp || 0,
                        ...parsed.metadata
                    });
                } catch {
                    // If not JSON, create basic metadata
                    saves.push({
                        slotId,
                        timestamp: Date.now()
                    });
                }
            }
        }

        return saves.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Clear all storage (for testing)
     */
    clear(): void {
        this.storage.clear();
    }

    /**
     * Get storage size (for testing)
     */
    size(): number {
        return this.storage.size;
    }
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

    private config: Required<HeadlessPlatformConfig>;

    // Singletons
    private renderContainer: IRenderContainer | null = null;
    private audioPlatform: IAudioPlatform | null = null;
    private inputAdapter: IInputAdapter | null = null;
    private storageAdapter: InMemoryStorageAdapter | null = null;

    constructor(config: HeadlessPlatformConfig = {}) {
        this.config = {
            width: config.width ?? 800,
            height: config.height ?? 600,
            pixelRatio: config.pixelRatio ?? 1.0,
            audio: config.audio ?? false,
            input: config.input ?? false,
            storagePrefix: config.storagePrefix ?? 'headless_'
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
    // CAPABILITIES
    // ========================================================================

    getCapabilities(): PlatformCapabilities {
        return {
            rendering: true,  // Headless rendering (no visual output)
            audio: this.config.audio,
            input: this.config.input,
            storage: true,  // In-memory storage always available
            network: false, // Headless typically no network
            realtime: false // No requestAnimationFrame in headless
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

export { InMemoryStorageAdapter };
