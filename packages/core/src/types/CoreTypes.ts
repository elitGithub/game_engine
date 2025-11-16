// engine/types/CoreTypes.ts

import type { EffectManager } from '../systems/EffectManager';
import type { AudioManager } from '../systems/AudioManager';
import type { SaveManager } from '../systems/SaveManager';
import type { InputManager } from '../systems/InputManager';
import type { AssetManager } from '@game-engine/core/systems/AssetManager';
import type { LocalizationManager } from '@game-engine/core/systems/LocalizationManager';
import type { RenderManager } from '@game-engine/core/core/RenderManager';
import type { IRenderer } from './RenderingTypes';

/**
 * CoreTypes - Core engine types and context definitions
 *
 * This file contains the fundamental types that form the backbone
 * of the engine:
 * - Engine configuration
 * - Game context (runtime state container)
 * - Typed game context helpers
 */

/**
 * GameConfig - Engine-level configuration
 *
 * Configuration options for the game engine itself, not for
 * game-specific logic. These control engine behavior like
 * rendering speed, debug mode, and versioning.
 *
 * @example
 * ```typescript
 * const config: GameConfig = {
 *   debug: true,
 *   targetFPS: 60,
 *   gameVersion: '1.0.0'
 * };
 * ```
 */
export interface GameConfig {
    /**
     * Enable debug mode with additional logging and error checking
     *
     * @default false
     */
    debug?: boolean;

    /**
     * Target frames per second for the game loop
     *
     * @default 60
     */
    targetFPS?: number;

    /**
     * Current version of the game for save file migration
     *
     * @default '1.0.0'
     */
    gameVersion?: string;
}

/**
 * GameContext - Engine layer context (untyped)
 *
 * The central runtime state container for the engine. This is the
 * "god object" that holds references to all core systems and game state.
 *
 * The engine layer uses this untyped version, which has a generic
 * `game: Record<string, unknown>` property. Game developers should
 * use `TypedGameContext<T>` to get proper typing for their game state.
 *
 * This context is passed to every GameState's methods (enter, update, exit)
 * and is accessible to all systems and plugins.
 *
 * @example
 * ```typescript
 * // Engine layer usage (untyped)
 * const context: GameContext = {
 *   game: {},
 *   flags: new Set(),
 *   variables: new Map(),
 *   assets: assetManager,
 *   audio: audioManager
 * };
 * ```
 */
export interface GameContext {
    /**
     * Game-specific state (untyped at engine layer)
     *
     * Use TypedGameContext<T> for type safety in game code
     */
    game: Record<string, unknown>;

    /**
     * Boolean flags for game state (e.g., "hasKey", "talkedToNPC")
     *
     * Persisted across save/load by default
     */
    flags: Set<string>;

    /**
     * Named variables for numeric/string data (e.g., "gold", "playerName")
     *
     * Persisted across save/load by default
     */
    variables: Map<string, unknown>;

    /**
     * Asset management system
     */
    assets?: AssetManager;

    /**
     * Audio playback system (music, SFX, voice)
     */
    audio?: AudioManager;

    /**
     * Save/load system
     */
    saveManager?: SaveManager;

    /**
     * Effect animation system
     */
    effects?: EffectManager;

    /**
     * Input handling system
     */
    input?: InputManager;

    /**
     * Render command queue manager
     */
    renderManager?: RenderManager;

    /**
     * Active renderer implementation (DOM, Canvas, etc.)
     */
    renderer?: IRenderer;

    /**
     * Localization and translation system
     */
    localization?: LocalizationManager;

    /**
     * Allow plugins to add custom properties
     */
    [key: string]: unknown;
}

/**
 * TypedGameContext - Typed version of GameContext for game layer use
 *
 * Provides type-safe access to game-specific state while preserving
 * access to all engine systems. Use this in your game code instead of
 * the raw GameContext.
 *
 * @typeParam TGame - Your game-specific state interface
 *
 * @example
 * ```typescript
 * interface MyGameState {
 *   player: Player;
 *   inventory: Item[];
 *   currentQuest: Quest | null;
 * }
 *
 * class BattleState extends GameState<MyGameState> {
 *   enter(context: TypedGameContext<MyGameState>) {
 *     // Type-safe access to game state
 *     context.game.player.health -= 10;
 *
 *     // Access to engine systems
 *     context.audio?.playSfx('damage');
 *     context.flags.add('inBattle');
 *   }
 * }
 * ```
 */
export type TypedGameContext<TGame> = Omit<GameContext, 'game'> & {
    game: TGame;
};
