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
import type {ILogger} from "@engine/interfaces/ILogger";


/**
 * System keys for platform-aware systems
 */
export const PLATFORM_SYSTEMS = {
    Logger: Symbol('Logger'),
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


// ============================================================================
// SYSTEM DEFINITION CREATORS (Extracted for modularity and testability)
// ============================================================================

function createAssetManagerDefinition(platform: IPlatformAdapter): SystemDefinition {
    return {
        key: PLATFORM_SYSTEMS.AssetManager,
        dependencies: [CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.Logger],
        factory: (c) => {
            const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
            const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);
            const assetManager = new AssetManager(eventBus, logger);

            const networkProvider = platform.getNetworkProvider?.();
            const imageLoader = platform.getImageLoader?.();

            if (imageLoader) {
                assetManager.registerLoader(new ImageLoader(imageLoader));
            }
            if (networkProvider) {
                assetManager.registerLoader(new JsonLoader(networkProvider, logger));
            }

            const audioPlatform = platform.getAudioPlatform?.();
            if (audioPlatform && networkProvider) {
                const audioContext = audioPlatform.getContext();
                if (audioContext) {
                    assetManager.registerLoader(new AudioLoader(audioContext, networkProvider, logger));
                }
            }

            return assetManager;
        },
        lazy: false
    };
}

function createAudioManagerDefinition(
    platform: IPlatformAdapter,
    audioConfig: PlatformSystemConfig['audio']
): SystemDefinition {
    return {
        key: PLATFORM_SYSTEMS.AudioManager,
        dependencies: [CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.AssetManager],
        factory: (c) => {
            const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
            const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);

            const audioPlatform = platform.getAudioPlatform?.();
            if (!audioPlatform) {
                throw new Error('[PlatformSystemDefs] Platform does not support audio. Cannot create AudioManager.');
            }

            const audioContext = audioPlatform.getContext();
            if (!audioContext) {
                throw new Error('[PlatformSystemDefs] Platform audio context is null. Cannot create AudioManager.');
            }

            const timer = platform.getTimerProvider();
            const config = (typeof audioConfig === 'object' ? audioConfig : {}) ?? {};
            const sfxPoolSize = config.sfxPoolSize ?? 10;
            const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);

            // Get audio capabilities for maxSources limit
            const capabilities = audioPlatform.getCapabilities();
            const maxSources = capabilities.maxSources;

            const audioManager = new AudioManager(eventBus, assetManager, audioContext, timer, {sfxPoolSize, maxSources}, logger);

            if (config.volume !== undefined) {
                audioManager.setMasterVolume(config.volume);
            }
            if (config.musicVolume !== undefined) {
                audioManager.setMusicVolume(config.musicVolume);
            }
            if (config.sfxVolume !== undefined) {
                audioManager.setSFXVolume(config.sfxVolume);
            }

            return audioManager;
        },
        lazy: false
    };
}

function createEffectManagerDefinition(platform: IPlatformAdapter): SystemDefinition {
    return {
        key: PLATFORM_SYSTEMS.EffectManager,
        dependencies: [PLATFORM_SYSTEMS.Logger],
        factory: (c) => new EffectManager(
            platform.getTimerProvider(),
            c.get<ILogger>(PLATFORM_SYSTEMS.Logger)
        ),
        lazy: false
    };
}

function createRendererDefinitions(): SystemDefinition[] {
    return [
        {
            key: PLATFORM_SYSTEMS.RendererDOM,
            dependencies: [PLATFORM_SYSTEMS.AssetManager],
            factory: (c) => {
                const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
                return new DomRenderer(assetManager);
            },
            lazy: false
        },
        {
            key: PLATFORM_SYSTEMS.RendererCanvas,
            dependencies: [PLATFORM_SYSTEMS.AssetManager],
            factory: (c) => {
                const assetManager = c.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
                return new CanvasRenderer(assetManager);
            },
            lazy: false
        }
    ];
}

function createRenderManagerDefinition(
    platform: IPlatformAdapter,
    rendererConfig: PlatformSystemConfig['renderer']
): SystemDefinition {
    const renderContainer = platform.getRenderContainer?.();
    if (!renderContainer) {
        throw new Error('[PlatformSystemDefs] Platform does not support rendering. Cannot create RenderManager.');
    }

    const rendererKey = rendererConfig!.type === 'canvas'
        ? PLATFORM_SYSTEMS.RendererCanvas
        : PLATFORM_SYSTEMS.RendererDOM;

    return {
        key: PLATFORM_SYSTEMS.RenderManager,
        dependencies: [
            CORE_SYSTEMS.EventBus,
            PLATFORM_SYSTEMS.RendererDOM,
            PLATFORM_SYSTEMS.RendererCanvas,
            PLATFORM_SYSTEMS.Logger
        ],
        factory: (c) => {
            const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
            const renderer = c.get<IRenderer>(rendererKey);

            return new RenderManager(
                rendererConfig!,
                eventBus,
                renderContainer,
                renderer,
                c.get<ILogger>(PLATFORM_SYSTEMS.Logger)
            );
        },
        lazy: false
    };
}

function createInputManagerDefinition(platform: IPlatformAdapter): SystemDefinition {
    return {
        key: PLATFORM_SYSTEMS.InputManager,
        dependencies: [CORE_SYSTEMS.StateManager, CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.Logger],
        factory: (c) => {
            const stateManager = c.get<GameStateManager>(CORE_SYSTEMS.StateManager);
            const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
            const timer = platform.getTimerProvider();
            const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);
            return new InputManager(stateManager, eventBus, timer, logger);
        },
        initialize: (inputManager, c) => {
            const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);

            const inputAdapter = platform.getInputAdapter?.();
            if (!inputAdapter) {
                logger.warn('[PlatformSystemDefs] Platform does not provide input adapter. Input will not work.');
                return;
            }

            inputAdapter.onEvent((event) => inputManager.processEvent(event));

            const renderContainer = platform.getRenderContainer?.();
            const attached = inputAdapter.attach(renderContainer, {tabindex: '0'});
            if (!attached) {
                logger.warn('[PlatformSystemDefs] Could not attach input adapter.');
            }
        },
        lazy: false
    };
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

    if (config.assets !== false) {
        definitions.push(createAssetManagerDefinition(platform));
    }

    if (config.audio !== false) {
        if (config.assets === false) {
            throw new Error('[PlatformSystemDefs] AudioManager requires AssetManager. Enable assets in config.');
        }
        definitions.push(createAudioManagerDefinition(platform, config.audio));
    }

    if (config.effects !== false) {
        definitions.push(createEffectManagerDefinition(platform));
    }

    if (config.renderer) {
        if (config.assets === false) {
            throw new Error('[PlatformSystemDefs] Renderers require AssetManager. Enable assets in config.');
        }
        definitions.push(...createRendererDefinitions());
        definitions.push(createRenderManagerDefinition(platform, config.renderer));
    }

    if (config.input !== false) {
        definitions.push(createInputManagerDefinition(platform));
    }

    return definitions;
}