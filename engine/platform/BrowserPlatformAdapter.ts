/**
 * Browser Platform Adapter
 *
 * Platform implementation for standard web browsers.
 * Provides DOM/Canvas rendering, Web Audio, keyboard/mouse input, and localStorage.
 */

import type {
    IAudioPlatform,
    IInputAdapter,
    IPlatformAdapter,
    IRenderContainer,
    ITimerProvider,
    PlatformCapabilities,
    PlatformType
} from '../interfaces';
import {CanvasRenderContainer, DomRenderContainer, WebAudioPlatform} from '../interfaces';
import {LocalStorageAdapter} from './browser/LocalStorageAdapter';
import type {StorageAdapter} from '../core/StorageAdapter';
import {DomInputAdapter} from '../core/DomInputAdapter';
import {GamepadInputAdapter} from './GamepadInputAdapter';
import {CompositeInputAdapter} from '@engine/interfaces';

/**
 * Browser platform configuration
 */
export interface BrowserPlatformConfig {
    /**
     * Container element for rendering
     * Can be a div (for DOM rendering) or canvas (for Canvas rendering)
     */
    containerElement: HTMLElement;

    /**
     * Render container type
     * 'auto' - detect based on element type
     * 'dom' - force DOM rendering
     * 'canvas' - force Canvas rendering
     */
    renderType?: 'auto' | 'dom' | 'canvas';

    /**
     * Enable audio
     * Default: true
     */
    audio?: boolean;

    /**
     * Enable input
     * Default: true
     */
    input?: boolean;

    /**
     * Storage key prefix for localStorage
     * Default: 'game_'
     */
    storagePrefix?: string;
}

/**
 * BrowserPlatformAdapter - Web browser implementation
 *
 * Singleton pattern: All adapters are created once and reused.
 *
 * Example:
 * ```typescript
 * const platform = new BrowserPlatformAdapter({
 *     containerElement: document.getElementById('game')!,
 *     renderType: 'canvas',
 *     audio: true,
 *     input: true
 * });
 *
 * const engine = new Engine({ platform, systems: { ... } });
 * ```
 */
export class BrowserPlatformAdapter implements IPlatformAdapter {
    public readonly type: PlatformType = 'browser';
    public readonly name: string;
    public readonly version?: string;

    private config: Required<BrowserPlatformConfig>;

    // Singletons
    private renderContainer: IRenderContainer | null = null;
    private audioPlatform: IAudioPlatform | null = null;
    private inputAdapter: IInputAdapter | null = null;
    private storageAdapter: StorageAdapter | null = null;
    private timerProvider: ITimerProvider | null = null;

    constructor(config: BrowserPlatformConfig) {
        this.config = {
            containerElement: config.containerElement,
            renderType: config.renderType ?? 'auto',
            audio: config.audio ?? true,
            input: config.input ?? true,
            storagePrefix: config.storagePrefix ?? 'game_'
        };

        // Detect browser name and version
        this.name = this.detectBrowserName();
        this.version = this.detectBrowserVersion();
    }

    // ========================================================================
    // RENDERING (SINGLETON)
    // ========================================================================

    getRenderContainer(): IRenderContainer {
        if (!this.renderContainer) {
            this.renderContainer = this.createRenderContainer();
        }
        return this.renderContainer;
    }

    private createRenderContainer(): IRenderContainer {
        const element = this.config.containerElement;

        // Determine render type
        let renderType = this.config.renderType;
        if (renderType === 'auto') {
            renderType = element instanceof HTMLCanvasElement ? 'canvas' : 'dom';
        }

        // Create appropriate container
        if (renderType === 'canvas') {
            if (!(element instanceof HTMLCanvasElement)) {
                throw new Error(
                    '[BrowserPlatform] Canvas rendering requires HTMLCanvasElement'
                );
            }
            return new CanvasRenderContainer(element);
        } else {
            return new DomRenderContainer(element);
        }
    }

    // ========================================================================
    // AUDIO (SINGLETON)
    // ========================================================================

    getAudioPlatform(): IAudioPlatform | undefined {
        if (!this.config.audio) {
            return undefined;
        }

        if (!this.audioPlatform) {
            this.audioPlatform = new WebAudioPlatform();
        }

        return this.audioPlatform;
    }

    // ========================================================================
    // STORAGE (SINGLETON)
    // ========================================================================

    getStorageAdapter(): StorageAdapter {
        if (!this.storageAdapter) {
            this.storageAdapter = new LocalStorageAdapter(this.config.storagePrefix);
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
            // Combine DOM input (keyboard/mouse) and gamepad input
            const domAdapter = new DomInputAdapter();
            const gamepadAdapter = new GamepadInputAdapter(this.getTimerProvider());
            this.inputAdapter = new CompositeInputAdapter(domAdapter, gamepadAdapter);
        }

        return this.inputAdapter;
    }

    // ========================================================================
    // TIMER (SINGLETON)
    // ========================================================================

    getTimerProvider(): ITimerProvider {
        if (!this.timerProvider) {
            this.timerProvider = {
                setTimeout: (callback: () => void, ms: number) => window.setTimeout(callback, ms) as unknown,
                clearTimeout: (id: unknown) => window.clearTimeout(id as number),
                now: () => Date.now()
            };
        }
        return this.timerProvider;
    }

    // ========================================================================
    // CAPABILITIES
    // ========================================================================

// [NEW CODE - Drop-in replacement for getCapabilities()]

    getCapabilities(): PlatformCapabilities {
        return {
            // --- Boolean Flags (Unchanged) ---
            rendering: true,
            audio: this.config.audio && this.isAudioSupported(),
            input: this.config.input,
            storage: this.isLocalStorageSupported(),
            network: true,
            realtime: true,

            // --- NEW: Platform Function Implementations ---

            /**
             * Provides the platform's 'fetch' implementation.
             */
            fetch: (url: string, options?: RequestInit) => window.fetch(url, options),

            /**
             * Provides the platform's implementation for loading an image from a URL.
             */
            loadImage: (src: string) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error(`[BrowserPlatform] Failed to load image: ${src}`));
                    img.src = src;
                });
            },

            /**
             * Provides the platform's storage adapter.
             */
            getStorage: () => this.getStorageAdapter(),

            /**
             * Provides the platform's 'requestAnimationFrame' implementation.
             */
            requestAnimationFrame: (callback: FrameRequestCallback) => window.requestAnimationFrame(callback),

            /**
             * Provides the platform's 'cancelAnimationFrame' implementation.
             */
            cancelAnimationFrame: (handle: number) => window.cancelAnimationFrame(handle),

            /**
             * Provides the platform's device pixel ratio.
             */
            get devicePixelRatio() {
                return window.devicePixelRatio || 1;
            }
        };
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    async initialize(): Promise<void> {
        // Browser platform doesn't need async initialization
        // Everything is created on-demand (singletons)
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

        // Clear singletons
        this.renderContainer = null;
        this.storageAdapter = null;
        this.timerProvider = null;
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    private isAudioSupported(): boolean {
        return typeof window !== 'undefined' &&
            (typeof window.AudioContext !== 'undefined' ||
                typeof (window as any).webkitAudioContext !== 'undefined');
    }

    private isLocalStorageSupported(): boolean {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            const testKey = '__storage_test__';
            window.localStorage.setItem(testKey, 'test');
            window.localStorage.removeItem(testKey);
            return true;
        } catch {
            return false;
        }
    }

    private detectBrowserName(): string {
        if (typeof window === 'undefined' || !window.navigator) {
            return 'Unknown Browser';
        }

        const ua = window.navigator.userAgent;

        if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) return 'Chrome';
        if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) return 'Safari';
        if (ua.indexOf('Firefox') > -1) return 'Firefox';
        if (ua.indexOf('Edg') > -1) return 'Edge';
        if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) return 'Internet Explorer';

        return 'Unknown Browser';
    }

    private detectBrowserVersion(): string | undefined {
        if (typeof window === 'undefined' || !window.navigator) {
            return undefined;
        }

        const ua = window.navigator.userAgent;
        let match: RegExpMatchArray | null = null;

        if (ua.indexOf('Chrome') > -1) {
            match = ua.match(/Chrome\/(\d+\.\d+)/);
        } else if (ua.indexOf('Safari') > -1) {
            match = ua.match(/Version\/(\d+\.\d+)/);
        } else if (ua.indexOf('Firefox') > -1) {
            match = ua.match(/Firefox\/(\d+\.\d+)/);
        } else if (ua.indexOf('Edg') > -1) {
            match = ua.match(/Edg\/(\d+\.\d+)/);
        }

        return match ? match[1] : undefined;
    }
}
