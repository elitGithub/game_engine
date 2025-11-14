// engine/types/PluginTypes.ts

import type { EventBus } from '@engine/core/EventBus';
import type { ISerializable } from './StateTypes';
import type { TypedGameContext } from './CoreTypes';

/**
 * PluginTypes - Types for the plugin system
 *
 * This file contains all types related to:
 * - Plugin interface and lifecycle
 * - Engine host interface for plugin installation
 * - Action context for game logic
 */

/**
 * IEngineHost - Interface exposed to plugins during installation
 *
 * This is the public API that plugins can use to register themselves
 * with the engine. Plugins receive an IEngineHost instance in their
 * install() method and can use it to:
 * - Access the game context
 * - Register event listeners
 * - Register serializable systems for save/load
 *
 * @typeParam TGame - Game-specific state interface
 *
 * @example
 * ```typescript
 * class MyPlugin implements IEnginePlugin {
 *   install(engine: IEngineHost) {
 *     // Access context
 *     engine.context.game.customData = {};
 *
 *     // Register for save/load
 *     engine.registerSerializableSystem('myPlugin', this.mySystem);
 *
 *     // Listen to events
 *     engine.eventBus.on('game:start', () => {
 *       console.log('Game started!');
 *     });
 *   }
 * }
 * ```
 */
export interface IEngineHost<TGame = Record<string, unknown>> {
    /**
     * Game context with all engine systems and game state
     */
    context: TypedGameContext<TGame>;

    /**
     * Event bus for publish/subscribe messaging
     */
    eventBus: EventBus;

    /**
     * Register a system to be included in save files
     *
     * @param key - Unique identifier for the system
     * @param system - System implementing ISerializable
     */
    registerSerializableSystem(key: string, system: ISerializable): void;

    /**
     * Unregister a previously registered serializable system
     *
     * @param key - Unique identifier of the system to remove
     */
    unregisterSerializableSystem(key: string): void;
}

/**
 * IEnginePlugin - Interface for engine plugins
 *
 * Plugins extend the engine with custom functionality without modifying
 * core code. Common use cases include:
 * - Quest systems
 * - Relationship tracking
 * - Combat systems
 * - Custom UI overlays
 * - Analytics and telemetry
 *
 * Plugins have a lifecycle with install, optional uninstall, and optional
 * update methods.
 *
 * @typeParam TGame - Game-specific state interface
 *
 * @example
 * ```typescript
 * class QuestPlugin implements IEnginePlugin {
 *   name = 'QuestSystem';
 *   version = '1.0.0';
 *
 *   private questManager: QuestManager;
 *
 *   install(engine: IEngineHost) {
 *     this.questManager = new QuestManager();
 *     engine.context.quests = this.questManager;
 *     engine.registerSerializableSystem('quests', this.questManager);
 *   }
 *
 *   uninstall(engine: IEngineHost) {
 *     engine.unregisterSerializableSystem('quests');
 *     delete engine.context.quests;
 *   }
 *
 *   update(deltaTime: number, context: TypedGameContext) {
 *     this.questManager.update(deltaTime);
 *   }
 * }
 * ```
 */
export interface IEnginePlugin<TGame = Record<string, unknown>> {
    /**
     * Plugin name for identification and debugging
     */
    name: string;

    /**
     * Plugin version (optional, for compatibility checking)
     */
    version?: string;

    /**
     * Called when the plugin is registered with the engine
     *
     * This is where you should:
     * - Initialize plugin systems
     * - Register event listeners
     * - Add properties to the context
     * - Register serializable systems
     *
     * @param engine - Engine host API for plugin integration
     */
    install(engine: IEngineHost<TGame>): void;

    /**
     * Called when the plugin is removed from the engine
     *
     * Optional cleanup method. Use this to:
     * - Unregister event listeners
     * - Remove context properties
     * - Unregister serializable systems
     * - Dispose of resources
     *
     * @param engine - Engine host API for plugin integration
     */
    uninstall?(engine: IEngineHost<TGame>): void;

    /**
     * Called every frame if implemented
     *
     * Optional update method for plugins that need to run logic
     * every frame (e.g., quest tracking, timed events).
     *
     * @param deltaTime - Time elapsed since last frame in milliseconds
     * @param context - Game context with all systems and state
     */
    update?(deltaTime: number, context: TypedGameContext<TGame>): void;
}

/**
 * ActionContext - Extended context for action execution
 *
 * Specialized context type used in action systems and scripting.
 * Extends TypedGameContext with a required `player` property.
 *
 * This is used by action registries and script systems where
 * a player entity is expected to be present.
 *
 * @typeParam TGame - Game-specific state interface
 *
 * @example
 * ```typescript
 * type MyAction = (ctx: ActionContext<MyGameState>) => void;
 *
 * const healAction: MyAction = (ctx) => {
 *   const player = ctx.player as Player;
 *   player.health = Math.min(player.health + 50, player.maxHealth);
 *   ctx.audio?.playSfx('heal');
 * };
 * ```
 */
export interface ActionContext<TGame = Record<string, unknown>> extends TypedGameContext<TGame> {
    /**
     * Reference to the player entity
     *
     * Type is unknown at engine layer; cast to your Player type in game code
     */
    player: unknown;
}
