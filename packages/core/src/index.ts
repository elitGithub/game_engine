/**
 * ========================================================================
 * GAME ENGINE "STEP 1" LIBRARY - PUBLIC API ENTRY POINT
 * ========================================================================
 *
 * This file is the single "front door" for the entire engine library.
 * "Step 2" frameworks (like "Project Scribe" or "Project Velocity")
 * should import all engine components from this single file.
 *
 * This enables a clean build process and a clear public API boundary.
 */

// --- Core Engine & Context ---
export { Engine, type EngineConfig } from './Engine';
export type { GameContext, TypedGameContext } from './types/CoreTypes';

// --- System Assembly (Dependency Injection) ---
export { SystemContainer, type SystemDefinition, type ISystemFactoryContext } from './core/SystemContainer';
export { CORE_SYSTEMS, createCoreSystemDefinitions } from './core/CoreSystemDefs';
export { PLATFORM_SYSTEMS, createPlatformSystemDefinitions, type PlatformSystemConfig } from './core/PlatformSystemDefs';

// --- Core Systems (Facades & Managers) ---
export { EventBus } from './core/EventBus';
export { GameState } from './core/GameState';
export { GameStateManager } from './core/GameStateManager';
export { PluginManager } from './core/PluginManager';
export { RenderManager } from './core/RenderManager';
export { SerializationRegistry } from './core/SerializationRegistry';
export { Action } from './systems/Action';
export { ActionRegistry } from './systems/ActionRegistry';
export { AssetManager, type AssetManifestEntry } from './systems/AssetManager';
export { AudioManager } from './systems/AudioManager';
export { EffectManager } from './systems/EffectManager';
export { InputManager } from './systems/InputManager';
export { LocalizationManager } from './systems/LocalizationManager';
export { MigrationManager } from './systems/MigrationManager';
export { SaveManager, type SaveData } from './systems/SaveManager';
export { Scene } from './systems/Scene';
export { SceneManager } from './systems/SceneManager';
export { InMemoryStorageAdapter } from './systems/InMemoryStorageAdapter';

// --- Platform Abstraction (Interfaces) ---
export type { IPlatformAdapter, PlatformCapabilities, PlatformType } from './interfaces/IPlatformAdapter';
export type { IRenderContainer, IDomRenderContainer, ICanvasRenderContainer } from './interfaces/IRenderContainer';
export type { IAudioPlatform, IAudioContext, IAudioBuffer, IAudioSource, IAudioGain } from './interfaces/IAudioPlatform';
export type { IInputAdapter, InputCapabilities, InputAdapterType } from './interfaces/IInputAdapter';
export type { ILogger } from './interfaces/ILogger';
export type { ITimerProvider } from './interfaces/ITimerProvider';
export type { IAssetLoader, AssetType } from './core/IAssetLoader';

// --- Platform Abstraction (Concrete Implementations) ---
export { BrowserPlatformAdapter, type BrowserPlatformConfig } from './platform/BrowserPlatformAdapter';
export { HeadlessPlatformAdapter, type HeadlessPlatformConfig } from './platform/HeadlessPlatformAdapter';

// --- Rendering ---
export { DomRenderer } from './rendering/DomRenderer';
export { CanvasRenderer } from './rendering/CanvasRenderer';
export { Dialogue } from './rendering/Dialogue';
export { DialogueLine } from './rendering/DialogueLine';
export { Speaker } from './rendering/Speaker';
export { SpeakerRegistry } from './rendering/SpeakerRegistry';
export { UIRenderer } from './rendering/helpers/UIRenderer';
export { TextRenderer } from './rendering/helpers/TextRenderer';
export { SceneRenderer } from './rendering/helpers/SceneRenderer';
export { DialogueLayoutHelper } from './rendering/helpers/DialogueLayoutHelper';
export { ChoiceLayoutHelper } from './rendering/helpers/ChoiceLayoutHelper';
export { TypewriterEffect } from './rendering/helpers/TypewriterEffect';
export { DomEffectTarget } from './rendering/DomEffectTarget';
export { CanvasEffectTarget } from './rendering/CanvasEffectTarget';
export { DEFAULT_Z_INDEX } from './constants/RenderingConstants';

// --- Input ---
export { InputActionMapper } from './input/InputActionMapper';
export { InputComboTracker } from './input/InputComboTracker';

// --- Audio ---
export { MusicPlayer, type MusicState } from './audio/MusicPlayer';
export { SfxPool } from './audio/SfxPool';
export { VoicePlayer } from './audio/VoicePlayer';
export { AudioUtils } from './audio/AudioUtils';

// --- Plugins ---
export { GameClockPlugin, type ClockConfig } from './plugins/GameClockPlugin';
export { InventoryManagerPlugin, type InventoryConfig } from './plugins/InventoryManagerPlugin';
export { RelationshipPlugin, type RelationshipConfig } from './plugins/RelationshipPlugin';

// --- Utils ---
export { CollectionTracker } from './utils/CollectionTracker';
export { ValueTracker } from './utils/ValueTracker';
export { Dice } from './utils/Dice';

// --- Types ---
export * from './types/index';
export * from './types/InputEvents';
export * from './types/RenderingTypes';
export * from './types/EngineEventMap';