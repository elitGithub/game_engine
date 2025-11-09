/**
 * CoreSystemDefs - Platform-agnostic core system definitions
 *
 * These systems have ZERO platform dependencies.
 * They never touch window, document, navigator, AudioContext, or any platform-specific APIs.
 *
 * Philosophy: "Step 1 - Engine Library"
 * These are pure, reusable, decoupled building blocks.
 */

import { SystemDefinition } from './SystemContainer';
import { EventBus } from './EventBus';
import { GameStateManager } from './GameStateManager';
import { SceneManager } from '../systems/SceneManager';
import { ActionRegistry } from '../systems/ActionRegistry';
import { PluginManager } from './PluginManager';

/**
 * System keys (symbols for type-safe DI)
 */
export const CORE_SYSTEMS = {
    EventBus: Symbol('EventBus'),
    StateManager: Symbol('StateManager'),
    SceneManager: Symbol('SceneManager'),
    ActionRegistry: Symbol('ActionRegistry'),
    PluginManager: Symbol('PluginManager'),
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
            factory: () => new EventBus(),
            lazy: false
        },

        // StateManager - no dependencies
        {
            key: CORE_SYSTEMS.StateManager,
            factory: () => new GameStateManager(),
            lazy: false
        },

        // SceneManager - depends on EventBus
        {
            key: CORE_SYSTEMS.SceneManager,
            dependencies: [CORE_SYSTEMS.EventBus],
            factory: (c) => {
                const eventBus = c.get<EventBus>(CORE_SYSTEMS.EventBus);
                return new SceneManager(eventBus);
            },
            lazy: false
        },

        // ActionRegistry - no dependencies
        {
            key: CORE_SYSTEMS.ActionRegistry,
            factory: () => new ActionRegistry(),
            lazy: false
        },

        // PluginManager - no dependencies
        {
            key: CORE_SYSTEMS.PluginManager,
            factory: () => new PluginManager(),
            lazy: false
        },
    ];
}
