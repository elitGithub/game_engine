/**
 * SystemFactory - Creates and wires up engine systems from config
 *
 * Handles dependency injection automatically based on system requirements.
 * Systems are created in the correct order to satisfy dependencies.
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
import type { SystemRegistry } from './SystemRegistry';
import { SYSTEMS } from './SystemRegistry';

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
        adapter?: any;
    };
    effects?: boolean;
    input?: boolean;
    renderer?: { type: 'canvas' | 'dom' | 'svelte' };  // Extend as needed
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
     * 7. EffectManager (depends on container element)
     * 8. InputManager (depends on StateManager, EventBus)
     * 9. PluginManager (no dependencies)
     */
    static create(
        config: SystemConfig,
        registry: SystemRegistry,
        containerElement?: HTMLElement
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

        // EffectManager (depends on: containerElement)
        if (config.effects !== false && containerElement) {
            const effectManager = new EffectManager(containerElement);
            registry.register(SYSTEMS.EffectManager, effectManager);
        }

        // InputManager (depends on: StateManager, EventBus)
        if (config.input !== false) {
            const stateManager = registry.get<GameStateManager>(SYSTEMS.StateManager);
            const eventBus = registry.get<EventBus>(SYSTEMS.EventBus);

            const inputManager = new InputManager(stateManager, eventBus);
            registry.register(SYSTEMS.InputManager, inputManager);
        }
    }
}