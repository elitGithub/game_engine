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
import {InputMode} from "@engine/systems/InputManager.ts";

// --- GameData definitions (moved from index.ts) ---
// We move these here because 'game.data.loaded' depends on GameData,
// and moving them here prevents a circular import with index.ts.
export interface SceneData {
    sceneType?: string;
    textKey?: string;
    choices?: SceneChoice[];

    [key: string]: any;
}

export interface SceneChoice {
    textKey: string;

    [key: string]: any;
}

export interface ScenesDataMap {
    [sceneId: string]: SceneData;
}

export interface ScenesDataMap {
    [sceneId: string]: SceneData;
}

export interface GameData {
    scenes?: ScenesDataMap;

    [key: string]: any;
}

// --- Engine Event Map Definition ---

/**
 * Defines the type-safe mapping for all events used by the core engine.
 * A game developer can extend the final 'EventMap' (in index.ts)
 * to add game-specific events.
 */
export interface EngineEventMap {
    // Engine
    'engine.started': {};
    'engine.stopped': {};
    'engine.paused': {};
    'engine.unpaused': {};
    'game.data.loaded': GameData;

    // SceneManager
    'scene.changed': {
        sceneId: string;
        type: string;
        previousScene: string | null;
    };

    // AssetManager
    'assets.manifest.loaded': { count: number };
    'assets.manifest.failed': { error: any };
    'assets.loaded': { id: string; type: AssetType; asset: any };
    'assets.cache.cleared': {};

    // AudioManager
    'audio.unlocked': {};
    'music.started': { trackId: string };
    'music.paused': {};
    'music.resumed': {};
    'music.stopped': {};
    'music.crossfaded': { newTrackId: string; duration: number };
    'voice.started': { voiceId: string };
    'audio.allStopped': {};

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
    'input.action': { action: string };
    'input.combo': { combo: string };
    'input.modeChanged': { mode: InputMode };

    // SaveManager
    'save.completed': { slotId: string; timestamp: number };
    'save.failed': { slotId: string; error: any };
    'save.loaded': { slotId: string; timestamp: number };
    'save.loadFailed': { slotId: string; error: any };
    'save.deleted': { slotId: string };

    // GameClockPlugin
    'clock.dayChanged': { day: number; previousDay: number };
    'clock.timeOfDayChanged': { rangeName: string | null; previousRange: string | null };
    'clock.advanced': { units: number; currentUnit: number; currentDay: number };

    // *** NEW: InventoryManagerPlugin ***
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