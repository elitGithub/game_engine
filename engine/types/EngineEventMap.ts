// engine/types/EngineEventMap.ts
import type {AssetType} from '@engine/core/IAssetLoader';
import type {
    ClickEvent,
    GamepadAxisEvent,
    GamepadButtonEvent,
    KeyDownEvent,
    KeyUpEvent,
    MouseDownEvent,
    MouseMoveEvent,
    MouseUpEvent,
    MouseWheelEvent,
    TouchEndEvent,
    TouchMoveEvent,
    TouchStartEvent,
} from '@engine/core/InputEvents';

export type InputMode = 'gameplay' | 'menu' | 'cutscene' | 'disabled' | string;

// --- GameData definitions (moved from index.ts) ---
export interface SceneData {
    sceneType?: string;
    textKey?: string;
    text?: string;
    choices?: SceneChoice[];
    requirements?: Record<string, unknown>;
    effects?: Record<string, unknown>;
    layers?: unknown[];
    backgroundAsset?: string;
    
    [key: string]: unknown;
}

export interface SceneChoice {
    text?: string;
    textKey: string;
    targetScene?: string;
    action?: string;
    
    [key: string]: unknown;
}

export interface ScenesDataMap {
    [sceneId: string]: SceneData;
}

export interface GameData {
    scenes?: ScenesDataMap;
}

// --- Engine Event Map Definition ---

/**
 * Defines the type-safe mapping for all events used by the core engine.
 */
export interface EngineEventMap {
    // Engine
    'engine.started': Record<string, never>;
    'engine.stopped': Record<string, never>;
    'engine.paused': Record<string, never>;
    'engine.unpaused': Record<string, never>;
    'game.data.loaded': GameData;

    // SceneManager
    'scene.changed': {
        sceneId: string;
        type: string;
        previousScene: string | null;
    };

    // AssetManager
    'assets.manifest.loaded': { count: number };
    'assets.manifest.failed': { error: unknown };
    'assets.loaded': { id: string; type: AssetType; asset: unknown };
    'assets.cache.cleared': Record<string, never>;

    // AudioManager
    'audio.unlocked': Record<string, never>;
    'music.started': { trackId: string };
    'music.paused': Record<string, never>;
    'music.resumed': Record<string, never>;
    'music.stopped': Record<string, never>;
    'music.crossfaded': { newTrackId: string; duration: number };
    'voice.started': { voiceId: string };
    'audio.allStopped': Record<string, never>;

    // InputManager
    'input.keydown': KeyDownEvent;
    'input.keyup': KeyUpEvent;
    'input.mousedown': MouseDownEvent;
    'input.mouseup': MouseUpEvent;
    'input.mousemove': MouseMoveEvent;
    'input.wheel': MouseWheelEvent;
    'input.click': ClickEvent;
    'input.touchstart': TouchStartEvent;
    'input.touchmove': TouchMoveEvent;
    'input.touchend': TouchEndEvent;
    'input.gamepadbutton': GamepadButtonEvent;
    'input.gamepadaxis': GamepadAxisEvent;
    'input.hotspot': { element: EventTarget | null; data: Record<string, string> };
    'input.action': { action: string };
    'input.combo': { combo: string };
    'input.modeChanged': { mode: InputMode };

    // SaveManager
    'save.completed': { slotId: string; timestamp: number };
    'save.failed': { slotId: string; error: unknown };
    'save.loaded': { slotId: string; timestamp: number };
    'save.loadFailed': { slotId: string; error: unknown };
    'save.deleted': { slotId: string };

    // GameClockPlugin
    'clock.dayChanged': { day: number; previousDay: number };
    'clock.timeOfDayChanged': { rangeName: string | null; previousRange: string | null };
    'clock.advanced': { units: number; currentUnit: number; currentDay: number };

    // InventoryManagerPlugin
    'inventory.item.added': {
        itemId: string;
        quantityAdded: number;
        newTotal: number;
    };
    'inventory.item.removed': {
        itemId: string;
        quantityRemoved: number;
        newTotal: number;
    };
    'inventory.add.failed.full': {
        itemId: string;
        quantityAttempted: number;
    };
}