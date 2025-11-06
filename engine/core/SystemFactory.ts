// engine/core/SystemFactory.ts
/**
 * SystemFactory - Creates and wires up engine systems from config
 *
 * Handles dependency injection automatically based on system requirements.
 * Systems are created in the correct order to satisfy dependencies.
 *
 * Now platform-agnostic - uses PlatformContainer interface instead of HTMLElement
 */

import { EventBus } from '../core/EventBus';
import { AssetManager } from '../systems/AssetManager';
import { AudioManager } from '../systems/AudioManager';
import { GameStateManager } from '../core/GameStateManager';
import { SceneManager } from '../systems/SceneManager';
import { ActionRegistry } from '../systems/ActionRegistry';
import { EffectManager } from '../systems/EffectManager';
import { InputManager } from '../systems/InputManager';
import { PluginManager } from '../core/PluginManager';
import { ImageLoader } from '../systems/asset_loaders/ImageLoader';
import { AudioLoader } from '../systems/asset_loaders/AudioLoader';
import { JsonLoader } from '../systems/asset_loaders/JsonLoader';
import { RenderManager } from './RenderManager';
import { DomInputAdapter } from './DomInputAdapter';
import type { SystemRegistry } from './SystemRegistry';
import { SYSTEMS } from './SystemRegistry';
import type { PlatformContainer } from './PlatformContainer';

/**
 * System configuration options
 */
export interface SystemConfig {
    audio?: boolean | {
        volume?: number;
        musicVolume?: number;
        sfxVolume?: number;
    };
    assets?: boolean;
    save?: boolean | {
        adapter?: unknown;
    };
    effects?: boolean;
    input?: boolean;
    renderer?: { type: 'canvas' | 'dom' | 'svelte' };
}

/**
 * Creates and configures engine systems based on user config
 */
export class SystemFactory {
    /**
     * Create all systems specified in config
     *
     * Systems are created in dependency order:
     * 1. EventBus (no dependencies)
     * 2. StateManager (no dependencies)
     * 3. AssetManager (depends on EventBus)
     * 4. AudioManager (depends on EventBus, AssetManager, AudioContext)
     * 5. SceneManager (depends on EventBus)
     * 6. ActionRegistry (no dependencies)
     * 7. EffectManager (depends on container)
     * 8. InputManager (depends on StateManager, EventBus)
     * 9. PluginManager (no dependencies)
     *
     * @param config System configuration
     * @param registry System registry for dependency injection
     * @param container Platform-agnostic container (optional)
     */
    static create(
        config: SystemConfig,
        registry: SystemRegistry,
        container?: PlatformContainer
    ): void {
        // ====================================================================
        // CORE SYSTEMS (always created)
        // ====================================================================

        // EventBus - always created first (no dependencies)
        const eventBus = new EventBus();
        registry.register(SYSTEMS.EventBus, eventBus);

        // StateManager - always created (no dependencies)
        const stateManager = new GameStateManager();
        registry.register(SYSTEMS.StateManager, stateManager);

        // SceneManager - always created (depends on: EventBus)
        const sceneManager = new SceneManager(eventBus);
        registry.register(SYSTEMS.SceneManager, sceneManager);

        // ActionRegistry - always created (no dependencies)
        const actionRegistry = new ActionRegistry();
        registry.register(SYSTEMS.ActionRegistry, actionRegistry);

        // PluginManager - always created (no dependencies)
        const pluginManager = new PluginManager();
        registry.register(SYSTEMS.PluginManager, pluginManager);

        // ====================================================================
        // OPTIONAL SYSTEMS (created based on config)
        // ====================================================================

        // AssetManager (depends on: EventBus)
        if (config.assets !== false) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            const assetManager = new AssetManager(eventBus);

            // Register default asset loaders
            assetManager.registerLoader(new ImageLoader());
            assetManager.registerLoader(new JsonLoader());
            assetManager.registerLoader(new AudioLoader(audioContext));

            registry.register(SYSTEMS.AssetManager, assetManager);

            // Store AudioContext for AudioManager
            (registry as any)._audioContext = audioContext;
        }

        // AudioManager (depends on: EventBus, AssetManager, AudioContext)
        if (config.audio !== false) {
            if (!registry.has(SYSTEMS.AssetManager)) {
                throw new Error('[SystemFactory] AudioManager requires AssetManager. Enable assets in config.');
            }

            const eventBus = registry.get<EventBus>(SYSTEMS.EventBus);
            const assetManager = registry.get<AssetManager>(SYSTEMS.AssetManager);
            const audioContext = (registry as any)._audioContext;

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

            registry.register(SYSTEMS.AudioManager, audioManager);
        }

        // EffectManager (depends on: container with DOM support)
        if (config.effects !== false && container) {
            const domElement = container.getDomElement?.();
            if (domElement) {
                const effectManager = new EffectManager(domElement);
                registry.register(SYSTEMS.EffectManager, effectManager);
            } else {
                console.warn('[SystemFactory] EffectManager requires DOM element. Skipping.');
            }
        }

        // Renderer (depends on: EventBus, AssetManager, SystemRegistry, container)
        if (config.renderer && container) {
            if (!registry.has(SYSTEMS.AssetManager)) {
                throw new Error('[SystemFactory] Renderer requires AssetManager. Enable assets in config.');
            }

            const eventBus = registry.get<EventBus>(SYSTEMS.EventBus);

            // Check if container supports rendering
            const domElement = container.getDomElement?.();
            if (domElement) {
                const renderManager = new RenderManager(
                    config.renderer,
                    eventBus,
                    domElement,
                    registry
                );

                registry.register(SYSTEMS.RenderManager, renderManager);
            } else {
                console.warn('[SystemFactory] Renderer requires DOM element. Skipping.');
            }
        }

        // InputManager (depends on: StateManager, EventBus)
        // Platform-agnostic input manager with optional adapter
        if (config.input !== false) {
            const stateManager = registry.get<GameStateManager>(SYSTEMS.StateManager);
            const eventBus = registry.get<EventBus>(SYSTEMS.EventBus);

            const inputManager = new InputManager(stateManager, eventBus);
            registry.register(SYSTEMS.InputManager, inputManager);

            // Create and attach adapter if container supports it
            if (container) {
                const domInputAdapter = new DomInputAdapter(inputManager);
                const attached = domInputAdapter.attachToContainer(container, { tabindex: '0' });

                if (!attached) {
                    console.warn('[SystemFactory] Could not attach DOM input adapter. Container may not support DOM.');
                }
            }
        }
    }
}