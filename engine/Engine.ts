import type {GameContext, ISerializable, ISerializationRegistry, MigrationFunction, StateData} from '@engine/types';
import {EventBus} from '@engine/core/EventBus';
import {GameStateManager} from '@engine/core/GameStateManager';
import {SceneManager} from '@engine/systems/SceneManager';
import {ActionRegistry} from '@engine/systems/ActionRegistry';
import {SaveManager} from '@engine/systems/SaveManager';
import {AudioManager} from '@engine/systems/AudioManager';
import {EffectManager} from '@engine/systems/EffectManager';
import {InputManager} from '@engine/systems/InputManager';
import type {AssetManager, AssetManifestEntry} from './systems/AssetManager';
import type {StorageAdapter} from '@engine/core/StorageAdapter';
import type {GameData} from "@engine/types/EngineEventMap";
import type {RenderManager} from "@engine/core/RenderManager";
import type {PluginManager} from './core/PluginManager';
import {SystemContainer} from './core/SystemContainer';
import {CORE_SYSTEMS} from './core/CoreSystemDefs';
import {PLATFORM_SYSTEMS} from './core/PlatformSystemDefs';
import type {IPlatformAdapter,} from '@engine/interfaces';
import type {Scene} from "@engine/systems/Scene";
import { ConsoleLogger } from '@engine/platform/ConsoleLogger';
import type {ILogger} from "@engine/interfaces/ILogger";

/**
 * System configuration (kept for backward compatibility)
 */
export interface SystemConfig {
    audio?: boolean | {
        volume?: number;
        musicVolume?: number;
        sfxVolume?: number;
    };
    assets?: boolean;
    save?: boolean | {
        adapter?: unknown;
    };
    effects?: boolean;
    input?: boolean;
    renderer?: { type: 'canvas' | 'dom' | 'svelte' };
}

/**
 * Engine configuration
 *
 * The gameState can be any object - the engine doesn't need to know its type.
 * For type-safe access in your game code, use TypedGameContext<YourGameState>
 */
export interface EngineConfig {
    debug?: boolean;
    targetFPS?: number;
    gameVersion?: string;

    /**
     * Maximum deltaTime in seconds to prevent physics tunneling and spiral of death.
     * If a frame takes longer than this (e.g., tab loses focus), deltaTime will be clamped.
     * Default: 0.1 (100ms / minimum 10fps)
     */
    maxDeltaTime?: number;

    /**
     * System configuration (optional for new DI-based approach)
     * When using the new DI approach, register systems manually via engine.container.register()
     * This field is kept for backward compatibility with legacy config-driven setup
     */
    systems?: SystemConfig;
    gameState: Record<string, unknown>;
    gameData?: GameData;
    platform?: IPlatformAdapter;
    storageAdapter?: StorageAdapter;
    localization?: boolean | {
        initialLanguage?: string;
    };
}

/**
 * Engine - Clean, unopinionated, config-driven game engine
 *
 * Usage:
 * ```ts
 * const engine = await Engine.create({
 * systems: { audio: true, assets: true, save: true },
 * gameState: myGameState
 * });
 *
 * // In game layer, cast to typed context:
 * const ctx = engine.context as TypedGameContext<MyGameState>;
 * ctx.game.player.health -= 10;
 * ```
 */
export class Engine implements ISerializationRegistry {
    public readonly config: Required<Pick<EngineConfig, 'debug' | 'targetFPS' | 'gameVersion' | 'maxDeltaTime'>>;
    public readonly context: GameContext;
    public readonly container: SystemContainer;
    private readonly platform: IPlatformAdapter;
    private readonly userConfig: EngineConfig;
    private readonly logger: ILogger;

    public serializableSystems: Map<string, ISerializable>;
    public migrationFunctions: Map<string, MigrationFunction>;

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;
    private gameLoopHandle: unknown = null;

    public constructor(userConfig: EngineConfig) {
        this.userConfig = userConfig;

        this.config = {
            debug: userConfig.debug ?? false,
            targetFPS: userConfig.targetFPS ?? 60,
            gameVersion: userConfig.gameVersion ?? '1.0.0',
            maxDeltaTime: userConfig.maxDeltaTime ?? 0.1
        };

        // Get or create platform adapter
        this.platform = this.resolvePlatform(userConfig);

        // --- BOOTSTRAP LOGGER ---
        // Get logger *directly* from platform to bootstrap the container
        // Provide a fallback ConsoleLogger if platform provides none
        this.logger = this.platform.getLogger?.() ?? new ConsoleLogger();
        // --- END BOOTSTRAP ---

        // Create SystemContainer (the ONLY DI container)
        this.container = new SystemContainer(this.logger);

        // Manually register the bootstrapped logger as a system
        // so other systems can depend on it.
        this.container.registerInstance(PLATFORM_SYSTEMS.Logger, this.logger);

        // Initialize context with game state
        this.context = {
            game: userConfig.gameState,
            flags: new Set(),
            variables: new Map()
        };

        // Serialization support
        this.serializableSystems = new Map();
        this.migrationFunctions = new Map();
        this.isRunning = false;
        this.isPaused = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;

        // Register core engine state as serializable
        this.registerSerializableSystem('_core', {
            serialize: () => ({
                flags: Array.from(this.context.flags),
                variables: Array.from(this.context.variables.entries()),
            }),
            deserialize: (data: unknown) => {
                const coreData = data as { flags?: string[]; variables?: Array<[string, unknown]> };
                this.context.flags = new Set(coreData.flags || []);
                this.context.variables = new Map(coreData.variables || []);
            },
        });

        // NOTE: Systems are NOT auto-registered.
        // The developer must explicitly register systems using:
        //   engine.container.register(definition)
        // Then call engine.initializeSystems()
    }

    /**
     * Resolve platform adapter from config
     * Handles both new (platform) and old (container) APIs
     */
    private resolvePlatform(config: EngineConfig): IPlatformAdapter {
        // New API: platform adapter provided directly
        if (config.platform) {
            return config.platform;
        }
        throw new Error('[Engine] Must provide either platform or container in config');
    }

    /**
     * Initialize all registered systems
     *
     * Call this after registering all system definitions.
     * This will:
     * 1. Initialize all non-lazy systems
     * 2. Wire StateManager context (if registered)
     * 3. Wire systems to context for convenience
     * 4. Create SaveManager (if enabled in config)
     * 5. Load game data (if provided in config)
     */
    initializeSystems(): void {
        // Initialize all non-lazy systems
        this.container.initializeAll();

        // Inject context into StateManager (if registered)
        if (this.container.has(CORE_SYSTEMS.StateManager)) {
            const stateManager = this.container.get<GameStateManager>(CORE_SYSTEMS.StateManager);
            stateManager.setContext(this.context);
        }

        // Load game data if provided
        if (this.userConfig.gameData) {
            if (this.container.has(CORE_SYSTEMS.SceneManager)) {
                this.loadGameData(this.userConfig.gameData);
            } else {
                this.logger.warn('[Engine] Cannot load game data: SceneManager not registered');
            }
        }
    }

    /**
     * Unlock audio (for autoplay policies)
     *
     * Call this after user interaction if AudioManager is registered.
     */
    async unlockAudio(): Promise<void> {
        if (this.container.has(PLATFORM_SYSTEMS.AudioManager)) {
            const audioManager = this.container.get<AudioManager>(PLATFORM_SYSTEMS.AudioManager);
            await audioManager.unlockAudio();
        }
    }

    // ========================================================================
    // TYPED SYSTEM GETTERS (for IDE autocomplete)
    // ========================================================================

    get eventBus(): EventBus {
        if (!this.container.has(CORE_SYSTEMS.EventBus)) {
            throw new Error('[Engine] EventBus not registered. Call container.register() with core system definitions.');
        }
        return this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
    }

    get audio(): AudioManager {
        if (!this.container.has(PLATFORM_SYSTEMS.AudioManager)) {
            throw new Error('[Engine] AudioManager not registered. Call container.register() with platform system definitions.');
        }
        return this.container.get<AudioManager>(PLATFORM_SYSTEMS.AudioManager);
    }

    get assets(): AssetManager {
        if (!this.container.has(PLATFORM_SYSTEMS.AssetManager)) {
            throw new Error('[Engine] AssetManager not registered. Call container.register() with platform system definitions.');
        }
        return this.container.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
    }

    get save(): SaveManager {
        if (!this.container.has(CORE_SYSTEMS.SaveManager)) {
            throw new Error('[Engine] SaveManager not initialized. Call initializeSystems() or enable save in config.');
        }
        return this.container.get<SaveManager>(CORE_SYSTEMS.SaveManager);
    }

    get stateManager(): GameStateManager {
        if (!this.container.has(CORE_SYSTEMS.StateManager)) {
            throw new Error('[Engine] StateManager not registered. Call container.register() with core system definitions.');
        }
        return this.container.get<GameStateManager>(CORE_SYSTEMS.StateManager);
    }

    get sceneManager(): SceneManager {
        if (!this.container.has(CORE_SYSTEMS.SceneManager)) {
            throw new Error('[Engine] SceneManager not registered. Call container.register() with core system definitions.');
        }
        return this.container.get<SceneManager>(CORE_SYSTEMS.SceneManager);
    }

    get actionRegistry(): ActionRegistry {
        if (!this.container.has(CORE_SYSTEMS.ActionRegistry)) {
            throw new Error('[Engine] ActionRegistry not registered. Call container.register() with core system definitions.');
        }
        return this.container.get<ActionRegistry>(CORE_SYSTEMS.ActionRegistry);
    }

    get effectManager(): EffectManager | undefined {
        return this.container.getOptional<EffectManager>(PLATFORM_SYSTEMS.EffectManager);
    }

    get inputManager(): InputManager | undefined {
        return this.container.getOptional<InputManager>(PLATFORM_SYSTEMS.InputManager);
    }

    get pluginManager(): PluginManager {
        if (!this.container.has(CORE_SYSTEMS.PluginManager)) {
            throw new Error('[Engine] PluginManager not registered. Call container.register() with core system definitions.');
        }
        return this.container.get<PluginManager>(CORE_SYSTEMS.PluginManager);
    }

    // ========================================================================
    // GAME DATA & ASSETS
    // ========================================================================

    loadGameData(gameData: GameData): void {
        this.log('Loading game data...');

        if (gameData.scenes) {
            this.sceneManager.loadScenes(gameData.scenes);
        }

        this.eventBus.emit('game.data.loaded', gameData);
    }

    /**
     * Pre-load assets from a manifest before starting the game.
     * This method should be called before start() to ensure all required assets are loaded.
     *
     * @param manifest - Array of asset manifest entries to preload
     * @returns A promise that resolves when all assets are loaded
     */
    async preload(manifest: AssetManifestEntry[]): Promise<void> {
        this.log(`Preloading ${manifest.length} assets...`);
        await this.assets.loadManifest(manifest);
        this.log('Asset preloading complete.');
    }

    // ========================================================================
    // ENGINE LIFECYCLE
    // ========================================================================

    /**
     * Start the game engine and begin the game loop.
     * Transitions to the initial game state and emits the 'engine.started' event.
     *
     * @param initialState - The ID of the initial game state to load
     * @param initialData - Optional data to pass to the initial state
     */
    start(initialState: string, initialData: StateData = {}): void {
        this.log('Starting engine...');

        this.isRunning = true;

        if (initialState) {
            this.stateManager.changeState(initialState, initialData);
        }

        this.lastFrameTime = performance.now();
        this.gameLoop();

        this.eventBus.emit('engine.started', {});
    }

    private gameLoop(): void {
        if (!this.isRunning) return;

        // Use platform abstraction for scheduling next frame
        const animProvider = this.platform.getAnimationProvider?.();
        if (animProvider) {
            // Browser: use requestAnimationFrame for smooth 60fps
            this.gameLoopHandle = animProvider.requestAnimationFrame(() => this.gameLoop());
        } else {
            // Headless/testing: use timer-based loop
            const timer = this.platform.getTimerProvider();
            const frameDelay = 1000 / this.config.targetFPS;
            this.gameLoopHandle = timer.setTimeout(() => this.gameLoop(), frameDelay);
        }

        const currentTime = performance.now();
        const rawDeltaTime = (currentTime - this.lastFrameTime) / 1000;
        // Clamp deltaTime to prevent physics tunneling when tab loses focus or debugger pauses
        const maxDelta = this.config.maxDeltaTime ?? 0.1; // Default: 100ms
        const deltaTime = Math.min(rawDeltaTime, maxDelta);
        this.lastFrameTime = currentTime;

        if (!this.isPaused) {
            this.stateManager.update(deltaTime);

            if (this.effectManager) {
                this.effectManager.update(deltaTime, this.context);
            }

            this.pluginManager.update(deltaTime, this.context);

            this.container.getOptional<RenderManager>(PLATFORM_SYSTEMS.RenderManager)?.flush();
        }

        this.frameCount++;
    }

    /**
     * Stop the game engine and halt the game loop.
     * Cancels any pending animation frames or timers and emits the 'engine.stopped' event.
     */
    stop(): void {
        this.log('Stopping engine...');
        this.isRunning = false;

        // Cancel pending game loop
        if (this.gameLoopHandle !== null) {
            const animProvider = this.platform.getAnimationProvider?.();
            if (animProvider) {
                animProvider.cancelAnimationFrame(this.gameLoopHandle as number);
            } else {
                const timer = this.platform.getTimerProvider();
                timer.clearTimeout(this.gameLoopHandle);
            }
            this.gameLoopHandle = null;
        }

        this.eventBus.emit('engine.stopped', {});
    }

    /**
     * Pause the game engine.
     * The game loop continues running but update logic is suspended.
     * Audio is suspended and the 'engine.paused' event is emitted.
     */
    pause(): void {
        if (this.isPaused) return;
        this.isPaused = true;

        // Suspend audio through platform adapter
        const audioPlatform = this.platform.getAudioPlatform?.();
        if (audioPlatform) {
            const audioContext = audioPlatform.getContext();
            if (audioContext) {
                audioContext.suspend();
            }
        }

        this.eventBus.emit('engine.paused', {});
    }

    unpause(): void {
        if (!this.isPaused) return;
        this.isPaused = false;

        // Resume audio through platform adapter
        const audioPlatform = this.platform.getAudioPlatform?.();
        if (audioPlatform) {
            const audioContext = audioPlatform.getContext();
            if (audioContext) {
                audioContext.resume();
            }
        }

        this.lastFrameTime = performance.now();
        this.eventBus.emit('engine.unpaused', {});
    }

    log(...args: unknown[]): void {
        if (this.config.debug) {
            this.logger.log('[Engine]', ...args);
        }
    }

    // ========================================================================
    // SERIALIZATION SUPPORT (for SaveManager)
    // ========================================================================

    get gameVersion(): string {
        return this.config.gameVersion;
    }

    getCurrentSceneId(): string {
        return this.sceneManager.getCurrentScene()?.sceneId || '';
    }

    restoreScene(sceneId: string): void {
        this.sceneManager.goToScene(sceneId, this.context);
    }

    registerSerializableSystem(key: string, system: ISerializable): void {
        if (this.serializableSystems.has(key)) {
            this.logger.warn(`[Engine] Serializable system key '${key}' already registered. Overwriting.`);
        }
        this.serializableSystems.set(key, system);
    }

    unregisterSerializableSystem(key: string): void {
        this.serializableSystems.delete(key);
    }

    registerMigration(fromVersion: string, toVersion: string, migration: MigrationFunction): void {
        const key = `${fromVersion}_to_${toVersion}`;
        if (this.migrationFunctions.has(key)) {
            this.logger.warn(`[Engine] Migration function '${key}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(key, migration);
    }

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    getCurrentStateName(): string | null {
        return this.stateManager.getCurrentStateName();
    }

    getCurrentScene(): Scene | null {
        return this.sceneManager.getCurrentScene();
    }
}