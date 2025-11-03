/**
 * Engine types only - no game-specific types
 */
import type { EffectManager } from './core/EffectManager';

export interface GameConfig {
    debug?: boolean;
    targetFPS?: number;
}

export interface GameContext {
    engine: any;
    player?: any;
    saveManager?: any;
    audio?: any;
    input?: any;
    effects?: EffectManager; // Added this line
    flags: Set<string>;
    variables: Map<string, any>;
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

// --- NEW EFFECT INTERFACES ---

/**
 * Interface for "Dynamic Effects" (e.g., heartbeat)
 * Applied to a specific element and updated every frame.
 */
export interface IDynamicEffect {
    /** Called once when the effect is applied */
    onStart(element: HTMLElement, context: GameContext): void;
    /** Called every frame the effect is active */
    onUpdate(element: HTMLElement, context: GameContext, deltaTime: number): void;
    /** Called when the effect is removed */
    onStop(element: HTMLElement, context: GameContext): void;
}

/**
 * Interface for "Global Effects" (e.g., x-ray scope)
 * Screen-wide, interactive effects that create their own DOM.
 */
export interface IGlobalEffect {
    /** Called once to create DOM elements */
    onCreate(container: HTMLElement, context: GameContext): void;
    /** Called every frame to update */
    onUpdate(context: GameContext, deltaTime: number): void;
    /** Called to clean up all DOM elements */
    onDestroy(context: GameContext): void;
}