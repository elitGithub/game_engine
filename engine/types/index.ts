/**
 * Engine types only - no game-specific types
 */
import type { EffectManager } from '../systems/EffectManager';
import type { AudioManager } from '../systems/AudioManager';
import type { SaveManager } from '../systems/SaveManager';
import type { InputManager } from '../systems/InputManager';

export interface GameConfig {
    debug?: boolean;
    targetFPS?: number;
    gameVersion?: string;
}

export interface GameContext {
    flags: Set<string>;
    variables: Map<string, any>;
    audio?: AudioManager;
    saveManager?: SaveManager;
    effects?: EffectManager;
    input?: InputManager;
    renderer?: any;
    [key: string]: any;
}


export type EventCallback = (data: any) => void;

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
    textAlign?: string;
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

export interface SceneChoice {
    text: string;
    [key: string]: any;
}

export interface SceneData {
    type?: string;
    text?: string;
    choices?: SceneChoice[];
    [key: string]: any;
}

export interface ScenesDataMap {
    [sceneId: string]: SceneData;
}

export interface GameData {
    scenes?: ScenesDataMap;
    [key: string]: any;
}

export interface ActionContext extends GameContext {
    player: any;
    [key: string]: any;
}

export interface IDynamicEffect {
    onStart(element: HTMLElement, context: GameContext): void;
    onUpdate(element: HTMLElement, context: GameContext, deltaTime: number): void;
    onStop(element: HTMLElement, context: GameContext): void;
}

export interface IGlobalEffect {
    onCreate(container: HTMLElement, context: GameContext): void;
    onUpdate(context: GameContext, deltaTime: number): void;
    onDestroy(context: GameContext): void;
}

export interface ISerializationRegistry {
    serializableSystems: Map<string, ISerializable>;
    migrationFunctions: Map<string, MigrationFunction>;
    gameVersion: string;
    getCurrentSceneId: () => string;
    restoreScene: (sceneId: string) => void;
}