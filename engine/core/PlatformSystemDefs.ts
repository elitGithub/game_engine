/**
 * PlatformSystemDefs - Platform-aware system definitions
 *
 * These systems need platform access, but they access it ONLY through IPlatformAdapter.
 * They NEVER directly call window, document, navigator, AudioContext, etc.
 *
 * Philosophy: "Step 1 - Engine Library"
 * These are still library components, but they require platform adapters.
 */

import {SystemDefinition} from '@engine/core/SystemContainer';
import {EventBus} from '@engine/core/EventBus';
import {AssetManager} from '@engine/systems/AssetManager';
import {AudioManager} from '@engine/systems/AudioManager';
import {EffectManager} from '@engine/systems/EffectManager';
import {RenderManager} from '@engine/core/RenderManager';
import {InputManager} from '@engine/systems/InputManager';
import {GameStateManager} from '@engine/core/GameStateManager';


import {DomRenderer} from '@engine/rendering/DomRenderer';
import {CanvasRenderer} from '@engine/rendering/CanvasRenderer';
import type {IPlatformAdapter} from '@engine/interfaces';
import type {IRenderer} from '@engine/types/RenderingTypes';
import {CORE_SYSTEMS} from "@engine/core/CoreSystemDefs";
import {ImageLoader} from "@engine/platform/browser/asset_loaders/ImageLoader";
import {JsonLoader} from "@engine/platform/browser/asset_loaders/JsonLoader";
import {AudioLoader} from "@engine/platform/browser/asset_loaders/AudioLoader";


/**
 * System keys for platform-aware systems
 */
export const PLATFORM_SYSTEMS = {
    AssetManager: Symbol('AssetManager'),
    AudioManager: Symbol('AudioManager'),
    EffectManager: Symbol('EffectManager'),
    RenderManager: Symbol('RenderManager'),
    InputManager: Symbol('InputManager'),
    // Renderer implementations (injected as dependencies)
    RendererDOM: Symbol('Renderer.DOM'),
    RendererCanvas: Symbol('Renderer.Canvas'),
} as const;

/**
 * Platform system configuration
 */
export interface PlatformSystemConfig {
    assets?: boolean;
    audio?: boolean | {
        volume?: number;
        musicVolume?: number;
        sfxVolume?: number;
        sfxPoolSize?: number;
    };
    effects?: boolean;
    renderer?: { type: 'canvas' | 'dom' | 'svelte' };
    input?: boolean;
}


/**
 * Create platform-aware system definitions
 *
 * CRITICAL: These systems access platform ONLY through IPlatformAdapter.
 * NO direct window, document, navigator, or AudioContext calls.
 *
 * @param platform Platform adapter (provides audio, rendering, input, storage)
 * @param config System configuration
 * @returns Array of SystemDefinition that can be registered with SystemContainer
 */
export function createPlatformSystemDefinitions(
    platform: IPlatformAdapter,
    config: PlatformSystemConfig
): SystemDefinition[] {
    const definitions: SystemDefinition[] = [];

    // ====================================================================
    // ASSET MANAGER (Platform-agnostic, but needs audio platform for AudioLoader)
    // ====================================================================

    if (config.assets !== false) {
        definitions.push({
            key: PLATFORM_SYSTEMS.AssetManager,
            dependencies: [CORE_SYSTEMS.EventBus],
            factory: (c) => {
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                const assetManager = new AssetManager(eventBus);

                // Get platform-specific loader functions from providers
                const networkProvider = platform.getNetworkProvider?.();
                const imageLoader = platform.getImageLoader?.();

                // Register loaders based on platform capabilities
                if (imageLoader) {
                    assetManager.registerLoader(new ImageLoader(imageLoader));
                }
                if (networkProvider) {
                    assetManager.registerLoader(new JsonLoader(networkProvider));
                }

                // Get AudioContext from platform (NOT from window)
                const audioPlatform = platform.getAudioPlatform?.();
                if (audioPlatform && networkProvider) {
                    const audioContext = audioPlatform.getNativeContext?.();
                    if (audioContext) {
                        // Inject both AudioContext and the platform's fetch
                        assetManager.registerLoader(new AudioLoader(audioContext, networkProvider));
                    }
                }

                return assetManager;
            },
            lazy: false
        });
    }

    // ====================================================================
    // AUDIO MANAGER (Requires IAudioPlatform)
    // ====================================================================

    if (config.audio !== false) {
        if (config.assets === false) {
            throw new Error('[PlatformSystemDefs] AudioManager requires AssetManager. Enable assets in config.');
        }

        definitions.push({
            key: PLATFORM_SYSTEMS.AudioManager,
            dependencies: [CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.AssetManager],
            factory: (c) => {
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);

                // Get AudioContext from platform (NOT from window)
                const audioPlatform = platform.getAudioPlatform?.();
                if (!audioPlatform) {
                    throw new Error('[PlatformSystemDefs] Platform does not support audio. Cannot create AudioManager.');
                }

                const audioContext = audioPlatform.getNativeContext?.();
                if (!audioContext) {
                    throw new Error('[PlatformSystemDefs] Platform audio context is null. Cannot create AudioManager.');
                }

                const timer = platform.getTimerProvider();
                const audioConfig = (typeof config.audio === 'object' ? config.audio : {}) ?? {};
                const sfxPoolSize = audioConfig.sfxPoolSize ?? 10;
                const audioManager = new AudioManager(eventBus, assetManager, audioContext, timer, {sfxPoolSize});

                // Apply audio config
                    if (audioConfig.volume !== undefined) { // <-- Use audioConfig
                        audioManager.setMasterVolume(audioConfig.volume);
                    }
                    if (audioConfig.musicVolume !== undefined) { // <-- Use audioConfig
                        audioManager.setMusicVolume(audioConfig.musicVolume);
                    }
                    if (audioConfig.sfxVolume !== undefined) { // <-- Use audioConfig
                        audioManager.setSFXVolume(audioConfig.sfxVolume);
                    }

                return audioManager;
            },
            lazy: false
        });
    }

    // ====================================================================
    // EFFECT MANAGER (Now platform-agnostic)
    // ====================================================================

    if (config.effects !== false) {
        definitions.push({
            key: PLATFORM_SYSTEMS.EffectManager,
            factory: () => new EffectManager(platform.getTimerProvider()),
            lazy: false
        });
    }

    // ====================================================================
    // RENDERERS (Renderer implementations as systems)
    // ====================================================================

    if (config.renderer) {
        if (config.assets === false) {
            throw new Error('[PlatformSystemDefs] Renderers require AssetManager. Enable assets in config.');
        }

        // DOM Renderer system
        definitions.push({
            key: PLATFORM_SYSTEMS.RendererDOM,
            dependencies: [PLATFORM_SYSTEMS.AssetManager],
            factory: (c) => {
                const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
                return new DomRenderer(assetManager);
            },
            lazy: false
        });

        // Canvas Renderer system
        definitions.push({
            key: PLATFORM_SYSTEMS.RendererCanvas,
            dependencies: [PLATFORM_SYSTEMS.AssetManager],
            factory: (c) => {
                const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
                return new CanvasRenderer(assetManager);
            },
            lazy: false
        });
    }

    // ====================================================================
    // RENDER MANAGER (Requires IRenderContainer from platform)
    // ====================================================================

    if (config.renderer) {
        const renderContainer = platform.getRenderContainer?.();
        if (!renderContainer) {
            throw new Error('[PlatformSystemDefs] Platform does not support rendering. Cannot create RenderManager.');
        }

        // Determine which renderer to use based on config
        const rendererKey = config.renderer.type === 'canvas'
            ? PLATFORM_SYSTEMS.RendererCanvas
            : PLATFORM_SYSTEMS.RendererDOM;

        definitions.push({
            key: PLATFORM_SYSTEMS.RenderManager,
            dependencies: [CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.RendererDOM, PLATFORM_SYSTEMS.RendererCanvas],
            factory: (c) => {
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                const renderer = c.get<IRenderer>(rendererKey);

                return new RenderManager(
                    config.renderer!,
                    eventBus,
                    renderContainer,
                    renderer
                );
            },
            lazy: false
        });
    }

    // ====================================================================
    // INPUT MANAGER (Requires IInputAdapter from platform)
    // ====================================================================

    if (config.input !== false) {
        definitions.push({
            key: PLATFORM_SYSTEMS.InputManager,
            dependencies: [CORE_SYSTEMS.StateManager, CORE_SYSTEMS.EventBus],
            factory: (c) => {
                const stateManager = c.get<GameStateManager>(CORE_SYSTEMS.StateManager);
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                const timer = platform.getTimerProvider();
                return new InputManager(stateManager, eventBus, timer);
            },
            initialize: (inputManager) => {
                // Get input adapter from platform (NOT from window/document)
                const inputAdapter = platform.getInputAdapter?.();
                if (!inputAdapter) {
                    console.warn('[PlatformSystemDefs] Platform does not provide input adapter. Input will not work.');
                    return;
                }

                // Wire adapter to InputManager
                inputAdapter.onEvent((event) => inputManager.processEvent(event));

                // Attach adapter to platform
                const renderContainer = platform.getRenderContainer?.();
                const attached = inputAdapter.attach(renderContainer, {tabindex: '0'});
                if (!attached) {
                    console.warn('[PlatformSystemDefs] Could not attach input adapter.');
                }
            },
            lazy: false
        });
    }

    return definitions;
}
