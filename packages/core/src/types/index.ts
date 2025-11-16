/**
 * Engine Types - Central barrel export
 *
 * This file re-exports all engine type definitions from their specialized files.
 * Types are organized by domain for better maintainability:
 *
 * - CoreTypes: Engine configuration and game context
 * - StateTypes: Serialization and save/load system
 * - DialogueTypes: Dialogue and text rendering
 * - PluginTypes: Plugin system and extensibility
 * - EffectTypes: Effect animation system
 * - ItemTypes: Optional game-specific helpers
 * - RenderingTypes: Rendering commands and interfaces
 * - EngineEventMap: Event system definitions
 */

// Core engine types
export type { GameConfig, GameContext, TypedGameContext } from './CoreTypes';

// State management and serialization
export type {
    StateData,
    ISerializable,
    MigrationFunction,
    ISerializationRegistry
} from './StateTypes';

// Dialogue and text rendering
export type {
    TypewriterConfig,
    SpeakerConfig,
    DialogueLineOptions,
    RenderOptions
} from './DialogueTypes';

// Plugin system
export type {
    IEngineHost,
    IEnginePlugin,
    ActionContext
} from './PluginTypes';

// Effect system
export type { EffectStep, IEffectTarget, IDynamicEffect } from './EffectTypes';

// Optional game-specific types
export type { BaseItem } from './ItemTypes';

// Rendering types
export type { IRenderer, TextStyleData } from '@game-engine/core/types/RenderingTypes';

// Render container implementations
export { DomRenderContainer } from '@game-engine/core/platform/browser/DomRenderContainer';
export { CanvasRenderContainer } from '@game-engine/core/platform/browser/CanvasRenderContainer';
export { HeadlessRenderContainer } from '@game-engine/core/interfaces/HeadlessRenderContainer';

// Event system types
import { EngineEventMap } from '@game-engine/core/types/EngineEventMap';

/**
 * ListenerMap - Type helper for event listener collections
 *
 * Maps event names to arrays of listener functions with proper typing.
 * Used internally by EventBus for type-safe event handling.
 */
export type ListenerMap = {
    [K in keyof EventMap]?: ((data: EventMap[K]) => void)[];
};

/**
 * EventMap - Extensible event type registry
 *
 * This interface uses declaration merging to allow game-specific code
 * to register custom event types. The EventBus uses this for type-safe
 * event publishing and subscription.
 *
 * IMPORTANT: This interface MUST remain in this file (index.ts) to support
 * declaration merging. Moving it to a separate file would break the ability
 * for game code to extend it via module augmentation.
 *
 * @example
 * ```typescript
 * // In your game's types file:
 * declare module '@game-engine/core/types' {
 *   interface EventMap {
 *     'player.tookDamage': { amount: number };
 *     'quest.completed': { questId: string; reward: number };
 *   }
 * }
 *
 * // Now these events are fully typed:
 * eventBus.on('player.tookDamage', (data) => {
 *   console.log(`Player took ${data.amount} damage`);
 * });
 * ```
 */
export interface EventMap extends EngineEventMap {
    // Game-specific events added via declaration merging
}
