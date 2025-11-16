/**
 * CoreSystemDefs - Platform-agnostic core system definitions
 *
 * These systems have ZERO platform dependencies.
 * They never touch window, document, navigator, AudioContext, or any platform-specific APIs.
 *
 * Philosophy: "Step 1 - Engine Library"
 * These are pure, reusable, decoupled building blocks.
 */

import {SystemDefinition} from '@game-engine/core/core/SystemContainer';
import {EventBus} from '@game-engine/core/core/EventBus';
import {GameStateManager} from '@game-engine/core/core/GameStateManager';
import {SceneManager} from '@game-engine/core/systems/SceneManager';
import {ActionRegistry} from '@game-engine/core/systems/ActionRegistry';
import {PluginManager} from '@game-engine/core/core/PluginManager';
import {SerializationRegistry} from '@game-engine/core/core/SerializationRegistry';
import type {ILogger} from '@game-engine/core/interfaces';
import {PLATFORM_SYSTEMS} from "@game-engine/core/core/PlatformSystemDefs";

/**
 * System keys (symbols for type-safe DI)
 */
export const CORE_SYSTEMS = {
    EventBus: Symbol('EventBus'),
    StateManager: Symbol('StateManager'),
    SceneManager: Symbol('SceneManager'),
    ActionRegistry: Symbol('ActionRegistry'),
    PluginManager: Symbol('PluginManager'),
    SerializationRegistry: Symbol('SerializationRegistry'),
    SaveManager: Symbol('SaveManager'),
} as const;

/**
 * Create core system definitions
 *
 * These systems are 100% platform-agnostic.
 * No window, document, navigator, AudioContext, or platform globals.
 *
 * @param gameVersion - Version string for save/load migration system
 * Returns an array of SystemDefinition that can be registered with SystemContainer.
 */
export function createCoreSystemDefinitions(gameVersion: string = '1.0.0'): SystemDefinition[] {
    return [
        // EventBus - no dependencies
        {
            key: CORE_SYSTEMS.EventBus,
            dependencies: [PLATFORM_SYSTEMS.Logger],
            factory: (c) => {
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);
                return new EventBus(logger)
            },
            lazy: false
        },

        {
            key: CORE_SYSTEMS.StateManager,
            dependencies: [PLATFORM_SYSTEMS.Logger],
            factory: (c) => {
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);
                return new GameStateManager(logger)
            },
            lazy: false
        },

        // SceneManager - depends on EventBus
        {
            key: CORE_SYSTEMS.SceneManager,
            dependencies: [CORE_SYSTEMS.EventBus, PLATFORM_SYSTEMS.Logger],
            factory: (c) => {
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger); // <-- 2. GET the dependency
                return new SceneManager(eventBus, logger);
            },
            lazy: false
        },
        {
            key: CORE_SYSTEMS.ActionRegistry,
            dependencies: [PLATFORM_SYSTEMS.Logger],

            factory: (c) => {
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger); // <-- 2. GET the dependency
                return new ActionRegistry(logger)
            },
            lazy: false
        },

        // SerializationRegistry - depends on SceneManager for scene state coordination
        {
            key: CORE_SYSTEMS.SerializationRegistry,
            dependencies: [CORE_SYSTEMS.SceneManager, PLATFORM_SYSTEMS.Logger],
            factory: (c) => {
                const sceneManager = c.get<SceneManager>(CORE_SYSTEMS.SceneManager);
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger);
                return new SerializationRegistry(sceneManager, gameVersion, logger);
            },
            lazy: false
        },

        {
            key: CORE_SYSTEMS.PluginManager,
            dependencies: [PLATFORM_SYSTEMS.Logger],
            factory: (c) => {
                const logger = c.get<ILogger>(PLATFORM_SYSTEMS.Logger); // <-- 2. GET the dependency
                return new PluginManager(logger); // <-- 3. INJECT the dependency
            },
            lazy: false
        },
    ];
}
