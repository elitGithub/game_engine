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
import {IRenderer, RenderCommand} from "@engine/types/RenderingTypes";
import {LocalizationManager} from "@engine/systems/LocalizationManager";

export interface GameConfig {
    debug?: boolean;
    targetFPS?: number;
    gameVersion?: string;
}

export interface GameContext<TGame = Record<string, any>> {
    game: TGame;
    flags: Set<string>;
    variables: Map<string, any>;
    assets?: AssetManager;
    audio?: AudioManager;
    saveManager?: SaveManager;
    effects?: EffectManager;
    input?: InputManager;
    renderQueue: RenderCommand[];
    renderer?: IRenderer;
    localization?: LocalizationManager;

    [key: string]: any;
}

export interface StateData {
    [key: string]: any;
}

export interface ISerializable {
    serialize(): any;

    deserialize(data: any): void;
}

export type MigrationFunction = (data: any) => any;

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
    animate?: boolean;
    style?: string | TextStyleConfig;
}

export interface ActionContext extends GameContext {
    player: any;

    [key: string]: any;
}

export interface ISerializationRegistry {
    serializableSystems: Map<string, ISerializable>;
    migrationFunctions: Map<string, MigrationFunction>;
    readonly gameVersion: string;

    getCurrentSceneId(): string;

    restoreScene(sceneId: string): void;
}


export interface IEngineHost {
    context: GameContext<any>;
    eventBus: EventBus;

    registerSerializableSystem(key: string, system: ISerializable): void;
}

export interface IEnginePlugin {
    name: string;
    version?: string;

    install(engine: IEngineHost): void;

    uninstall?(engine: IEngineHost): void;

    update?(deltaTime: number, context: GameContext<any>): void;
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
 * interface EventMap {
 * 'player.tookDamage': { amount: number };
 * }
 * }
 */
export interface EventMap extends EngineEventMap {
}