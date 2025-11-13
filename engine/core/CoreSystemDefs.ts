/**
 * CoreSystemDefs - Platform-agnostic core system definitions
 *
 * These systems have ZERO platform dependencies.
 * They never touch window, document, navigator, AudioContext, or any platform-specific APIs.
 *
 * Philosophy: "Step 1 - Engine Library"
 * These are pure, reusable, decoupled building blocks.
 */

import {SystemDefinition} from '@engine/core/SystemContainer';
import {EventBus} from '@engine/core/EventBus';
import {GameStateManager} from '@engine/core/GameStateManager';
import {SceneManager} from '@engine/systems/SceneManager';
import {ActionRegistry} from '@engine/systems/ActionRegistry';
import {PluginManager} from '@engine/core/PluginManager';
import type {ILogger} from '@engine/interfaces';
import {PLATFORM_SYSTEMS} from "@engine/core/PlatformSystemDefs";

/**
 * System keys (symbols for type-safe DI)
 */
export const CORE_SYSTEMS = {
    EventBus: Symbol('EventBus'),
    StateManager: Symbol('StateManager'),
    SceneManager: Symbol('SceneManager'),
    ActionRegistry: Symbol('ActionRegistry'),
    PluginManager: Symbol('PluginManager'),
    SaveManager: Symbol('SaveManager'),
} as const;

/**
 * Create core system definitions
 *
 * These systems are 100% platform-agnostic.
 * No window, document, navigator, AudioContext, or platform globals.
 *
 * Returns an array of SystemDefinition that can be registered with SystemContainer.
 */
export function createCoreSystemDefinitions(): SystemDefinition[] {
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
