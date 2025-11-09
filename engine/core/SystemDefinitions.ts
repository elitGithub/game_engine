/**
 * SystemDefinitions - Core system factory definitions
 *
 * This file defines how each core system should be created,
 * including dependencies and initialization logic.
 */

import {SystemDefinition} from './SystemContainer';
import {SYSTEMS} from './SystemRegistry';
import {EventBus} from './EventBus';
import {GameStateManager} from './GameStateManager';
import {SceneManager} from '../systems/SceneManager';
import {ActionRegistry} from '../systems/ActionRegistry';
import {PluginManager} from './PluginManager';
import {AssetManager} from '../systems/AssetManager';
import {AudioManager} from '../systems/AudioManager';
import {EffectManager} from '../systems/EffectManager';
import {RenderManager, type IRendererProvider} from './RenderManager';
import {InputManager} from '../systems/InputManager';
import {DomInputAdapter} from './DomInputAdapter';
import {ImageLoader} from '../systems/asset_loaders/ImageLoader';
import {AudioLoader} from '../systems/asset_loaders/AudioLoader';
import {JsonLoader} from '../systems/asset_loaders/JsonLoader';
import {DomRenderer} from '../rendering/DomRenderer';
import {CanvasRenderer} from '../rendering/CanvasRenderer';
import {DomRenderContainer} from '../interfaces/IRenderContainer';
import type {SystemConfig} from './SystemFactory';
import type {PlatformContainer} from './PlatformContainer';

/**
 * Create core system definitions based on config
 */
export function createCoreSystemDefinitions(
    config: SystemConfig,
    container?: PlatformContainer
): SystemDefinition[] {
    const definitions: SystemDefinition[] = [];

    // ====================================================================
    // CORE SYSTEMS (always created, never lazy)
    // ====================================================================

    // EventBus - no dependencies
    definitions.push({
        key: SYSTEMS.EventBus,
        factory: () => new EventBus(),
        lazy: false
    });

    // StateManager - no dependencies
    definitions.push({
        key: SYSTEMS.StateManager,
        factory: () => new GameStateManager(),
        lazy: false
    });

    // SceneManager - depends on EventBus
    definitions.push({
        key: SYSTEMS.SceneManager,
        dependencies: [SYSTEMS.EventBus],
        factory: (c) => {
            const eventBus = c.get<EventBus>(SYSTEMS.EventBus);
            return new SceneManager(eventBus);
        },
        lazy: false
    });

    // ActionRegistry - no dependencies
    definitions.push({
        key: SYSTEMS.ActionRegistry,
        factory: () => new ActionRegistry(),
        lazy: false
    });

    // PluginManager - no dependencies
    definitions.push({
        key: SYSTEMS.PluginManager,
        factory: () => new PluginManager(),
        lazy: false
    });

    // ====================================================================
    // OPTIONAL SYSTEMS (created based on config, can be lazy)
    // ====================================================================

    // AssetManager (required by AudioManager and RenderManager)
    if (config.assets !== false) {
        // Create AudioContext for AssetManager's AudioLoader
        let audioContext: AudioContext | undefined;
        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('[SystemDefinitions] Web Audio API not supported.');
        }

        definitions.push({
            key: SYSTEMS.AssetManager,
            dependencies: [SYSTEMS.EventBus],
            factory: (c) => {
                const eventBus = c.get<EventBus>(SYSTEMS.EventBus);
                const assetManager = new AssetManager(eventBus);

                // Register default loaders
                assetManager.registerLoader(new ImageLoader());
                assetManager.registerLoader(new JsonLoader());
                if (audioContext) {
                    assetManager.registerLoader(new AudioLoader(audioContext));
                }

                return assetManager;
            },
            lazy: false // Assets are typically needed early
        });
    }

    // AudioManager
    if (config.audio !== false) {
        if (config.assets === false) {
            throw new Error('[SystemDefinitions] AudioManager requires AssetManager. Enable assets in config.');
        }

        definitions.push({
            key: SYSTEMS.AudioManager,
            dependencies: [SYSTEMS.EventBus, SYSTEMS.AssetManager],
            factory: (c) => {
                const eventBus = c.get<EventBus>(SYSTEMS.EventBus);
                const assetManager = c.get<AssetManager>(SYSTEMS.AssetManager);

                // Create AudioContext
                let audioContext: AudioContext;
                try {
                    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                } catch (e) {
                    throw new Error('[SystemDefinitions] Web Audio API not supported. Cannot create AudioManager.');
                }

                const audioManager = new AudioManager(eventBus, assetManager, audioContext);

                // Apply audio config
                if (typeof config.audio === 'object') {
                    if (config.audio.volume !== undefined) {
                        audioManager.setMasterVolume(config.audio.volume);
                    }
                    if (config.audio.musicVolume !== undefined) {
                        audioManager.setMusicVolume(config.audio.musicVolume);
                    }
                    if (config.audio.sfxVolume !== undefined) {
                        audioManager.setSFXVolume(config.audio.sfxVolume);
                    }
                }

                return audioManager;
            },
            lazy: false // Audio typically needs early initialization
        });
    }

    // EffectManager
    if (config.effects !== false && container) {
        const domElement = container.getDomElement?.();
        if (domElement) {
            definitions.push({
                key: SYSTEMS.EffectManager,
                factory: () => new EffectManager(domElement),
                lazy: false // Created immediately when configured
            });
        }
    }

    // RenderManager
    if (config.renderer && container) {
        if (config.assets === false) {
            throw new Error('[SystemDefinitions] Renderer requires AssetManager. Enable assets in config.');
        }

        const domElement = container.getDomElement?.();
        if (!domElement) {
            console.warn('[SystemDefinitions] Renderer requires DOM element. Skipping.');
        } else {
            definitions.push({
                key: SYSTEMS.RenderManager,
                dependencies: [SYSTEMS.EventBus, SYSTEMS.AssetManager],
                factory: (c) => {
                    const eventBus = c.get<EventBus>(SYSTEMS.EventBus);
                    const assetManager = c.get<AssetManager>(SYSTEMS.AssetManager);

                    // Create render container from DOM element
                    const renderContainer = new DomRenderContainer(domElement);

                    // Ensure renderer provider is available (provided by SystemContainerBridge)
                    if (!c.getRenderer) {
                        throw new Error('[SystemDefinitions] RenderManager requires renderer provider (getRenderer method)');
                    }

                    // Create adapter for renderer resolution
                    const rendererProvider: IRendererProvider = {
                        getRenderer: (type: string) => c.getRenderer!(type)
                    };

                    // Create RenderManager with renderer provider
                    return new RenderManager(
                        config.renderer!,
                        eventBus,
                        renderContainer,
                        rendererProvider
                    );
                },
                initialize: (renderManager, c) => {
                    // Register renderers with the factory context
                    const assetManager = c.get<AssetManager>(SYSTEMS.AssetManager);

                    // Renderer registration is provided by SystemContainerBridge
                    if (c.registerRenderer) {
                        c.registerRenderer('dom', new DomRenderer(assetManager));
                        c.registerRenderer('canvas', new CanvasRenderer(assetManager));
                    }
                },
                lazy: false // Rendering typically needed early
            });
        }
    }

    // InputManager
    if (config.input !== false) {
        definitions.push({
            key: SYSTEMS.InputManager,
            dependencies: [SYSTEMS.StateManager, SYSTEMS.EventBus],
            factory: (c) => {
                const stateManager = c.get<GameStateManager>(SYSTEMS.StateManager);
                const eventBus = c.get<EventBus>(SYSTEMS.EventBus);
                return new InputManager(stateManager, eventBus);
            },
            initialize: (inputManager) => {
                // Attach input adapter if container supports it
                if (container) {
                    const domInputAdapter = new DomInputAdapter();

                    // Register event handler
                    domInputAdapter.onEvent((event) => inputManager.processEvent(event));

                    // Attach to container
                    const attached = domInputAdapter.attachToContainer(container, { tabindex: '0' });

                    if (!attached) {
                        console.warn('[SystemDefinitions] Could not attach DOM input adapter.');
                    }
                }
            },
            lazy: false // Input typically needed early
        });
    }

    return definitions;
}
