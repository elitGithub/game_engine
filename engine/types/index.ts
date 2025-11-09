/**
 * Engine types only - no game-specific types
 */
import type {EffectManager} from '../systems/EffectManager';
import type {AudioManager} from '../systems/AudioManager';
import type {SaveManager} from '../systems/SaveManager';
import type {InputManager} from '../systems/InputManager';
import {EventBus} from "@engine/core/EventBus";
import {AssetManager} from "@engine/systems/AssetManager";
import {EngineEventMap} from "@engine/types/EngineEventMap";
import {IRenderer} from "@engine/types/RenderingTypes";
import {LocalizationManager} from "@engine/systems/LocalizationManager";
import {RenderManager} from "@engine/core/RenderManager";

export interface GameConfig {
    debug?: boolean;
    targetFPS?: number;
    gameVersion?: string;
}

/**
 * GameContext - Engine layer context (untyped)
 *
 * The engine layer doesn't need to know about game-specific types.
 * Game developers can cast this to a typed version in their game layer.
 */
export interface GameContext {
    game: Record<string, unknown>;
    flags: Set<string>;
    variables: Map<string, unknown>;
    assets?: AssetManager;
    audio?: AudioManager;
    saveManager?: SaveManager;
    effects?: EffectManager;
    input?: InputManager;
    renderManager?: RenderManager;
    renderer?: IRenderer;
    localization?: LocalizationManager;

    // Allow plugins to add properties dynamically
    [key: string]: unknown;
}

/**
 * Typed GameContext for game layer use
 *
 * Example:
 * ```ts
 * interface MyGameState {
 *   player: Player;
 *   inventory: Item[];
 * }
 *
 * class MyGameState extends GameState<MyGameState> {
 *   enter() {
 *     const ctx = this.context as TypedGameContext<MyGameState>;
 *     ctx.game.player.health -= 10;
 *   }
 * }
 * ```
 */
export type TypedGameContext<TGame> = Omit<GameContext, 'game'> & {
    game: TGame;
};

export type StateData = Record<string, unknown>;

export interface ISerializable {
    serialize(): unknown;
    deserialize(data: unknown): void;
}

export type MigrationFunction = (data: unknown) => unknown;

export type EffectStep =
    | { name: string; duration: number }
    | { wait: number };

export interface RenderOptions {
    style?: string | TextStyleConfig;
    animate?: boolean;
    speed?: number;
    speaker?: string;
}

export interface TextStyleConfig {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    lineHeight?: string;
    letterSpacing?: string;
    color?: string;
    backgroundColor?: string;
    textShadow?: string;
    textAlign?: 'left' | 'center' | 'right';
    textTransform?: string;
    textDecoration?: string;
    margin?: string;
    padding?: string;
    border?: string;
    borderRadius?: string;
    position?: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    width?: string;
    maxWidth?: string;
    transition?: string;
    animation?: string;
    boxShadow?: string;
    opacity?: string;
    customCSS?: Record<string, string>;
}

export interface TypewriterConfig {
    charsPerSecond?: number;
    punctuationDelay?: number;
    skipKey?: string;
    skipMultiplier?: number;
}

export interface SpeakerConfig {
    id: string;
    name: string;
    displayName?: string;
    color?: string;
    portrait?: string;
    portraitPosition?: 'left' | 'right';
    textStyle?: TextStyleConfig;
    voiceId?: string;
    voicePitch?: number;
    voiceSpeed?: number;
}

export interface DialogueLineOptions {
    showPortrait?: boolean;
    showName?: boolean;
    style?: string | TextStyleConfig;
}

export interface ActionContext<TGame = Record<string, unknown>> extends TypedGameContext<TGame> {
    player: unknown;
}

export interface ISerializationRegistry {
    serializableSystems: Map<string, ISerializable>;
    migrationFunctions: Map<string, MigrationFunction>;
    readonly gameVersion: string;

    getCurrentSceneId(): string;
    restoreScene(sceneId: string): void;
}

export interface IEngineHost<TGame = Record<string, unknown>> {
    context: TypedGameContext<TGame>;
    eventBus: EventBus;

    registerSerializableSystem(key: string, system: ISerializable): void;
}

export interface IEnginePlugin<TGame = Record<string, unknown>> {
    name: string;
    version?: string;

    install(engine: IEngineHost<TGame>): void;
    uninstall?(engine: IEngineHost<TGame>): void;
    update?(deltaTime: number, context: TypedGameContext<TGame>): void;
}

/**
 * Optional base interface for items.
 * Games can extend this or ignore it entirely.
 */
export interface BaseItem {
    id: string;
    name: string;
    description?: string;
    stackable?: boolean;
}

/**
 * This is the final, extensible EventMap.
 * Game-specific code can extend this interface using declaration merging.
 *
 * @example
 * // In your game's types file:
 * declare module '@engine/types' {
 *   interface EventMap {
 *     'player.tookDamage': { amount: number };
 *   }
 * }
 */
export interface EventMap extends EngineEventMap {
}
