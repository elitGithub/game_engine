/**
 * Complete TypeScript type definitions
 */

// ============================================================================
// CORE ENGINE TYPES
// ============================================================================

export interface GameConfig {
    debug?: boolean;
    targetFPS?: number;
}

// Forward declarations - actual implementations in respective files
// This avoids circular dependencies

export interface GameContext {
    engine: any; // Engine instance
    player?: any; // Player instance
    flags: Set<string>;
    variables: Map<string, any>;
    renderer?: any; // TextRenderer | SpriteRenderer
    itemDatabase?: any; // ItemDatabase instance
    enemyDatabase?: any; // EnemyDatabase instance
    enemy?: any; // Enemy instance
    noEscape?: boolean;
    isDefending?: boolean;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

export type EventCallback = (data: any) => void;

export interface EventSubscription {
    unsubscribe: () => void;
}

// ============================================================================
// STATE TYPES
// ============================================================================

export interface StateData {
    [key: string]: any;
}

// ============================================================================
// RENDERING TYPES
// ============================================================================

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

// ============================================================================
// SCENE TYPES
// ============================================================================

export interface SceneRequirements {
    hasItem?: string;
    hasFlag?: string;
    [key: string]: any;
}

export interface SceneEffects {
    setFlag?: string;
    heal?: number;
    damage?: number;
    giveItem?: string;
    [key: string]: any;
}

export interface SceneChoice {
    text: string;
    targetScene?: string;
    requiresItem?: string;
    requiresFlag?: string;
    hidesOnFlag?: string;
    action?: string;
    enemyId?: string;
    [key: string]: any;
}

export interface SceneData {
    type?: string;
    text?: string;
    action?: string;
    choices?: SceneChoice[];
    requirements?: SceneRequirements;
    effects?: SceneEffects;
    enemyId?: string;
    noEscape?: boolean;
    itemId?: string;
    quantity?: number;
    quotes?: string[];
    flag?: string;
    [key: string]: any;
}

export interface ScenesDataMap {
    [sceneId: string]: SceneData;
}

export interface GameData {
    scenes?: ScenesDataMap;
    [key: string]: any;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionContext extends GameContext {
    player: any; // Player instance (required in action context)
    [key: string]: any;
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

export interface PlayerStats {
    skill: number;
    maxSkill: number;
    stamina: number;
    maxStamina: number;
    luck: number;
    maxLuck: number;
    weaponBonus: number;
}

export interface PlayerInventory {
    [itemId: string]: number;
}

export interface PlayerSaveData {
    skill: number;
    maxSkill: number;
    stamina: number;
    maxStamina: number;
    luck: number;
    maxLuck: number;
    inventory: [string, number][];
    flags: string[];
    weaponBonus: number;
}

export interface EnemyData {
    id: string;
    name: string;
    skill: number;
    stamina: number;
    description?: string;
    loot?: string[];
    specialAbility?: string | null;
}

export interface ItemEffect {
    stamina?: number;
    luck?: number;
    skill?: number;
}

export interface ItemData {
    id: string;
    name: string;
    description: string;
    isStackable?: boolean;
    effect?: ItemEffect;
    bonus?: number;
}

// ============================================================================
// COMBAT TYPES
// ============================================================================

export interface CombatResult {
    playerAttack: number;
    enemyAttack: number;
    playerHit: boolean;
    enemyHit: boolean;
    damage: number;
    round?: number;
    playerStamina?: number;
    enemyStamina?: number;
}

export interface BattleStateData {
    enemyId: string;
    returnScene?: string;
    noEscape?: boolean;
}

// ============================================================================
// RENDERER TYPES (GAME-SPECIFIC)
// ============================================================================

export interface ChoiceData {
    text: string;
    id?: string;
    [key: string]: any;
}