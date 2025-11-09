import type {GameContext, ISerializable, ISerializationRegistry, MigrationFunction, StateData} from '@engine/types';
import {EventBus} from './core/EventBus';
import {GameStateManager} from './core/GameStateManager';
import {SceneManager} from './systems/SceneManager';
import {ActionRegistry} from './systems/ActionRegistry';
import {SaveManager} from './systems/SaveManager';
import {AudioManager} from './systems/AudioManager';
import {EffectManager} from './systems/EffectManager';
import {InputManager} from './systems/InputManager';
import type {AssetManager, AssetManifestEntry} from './systems/AssetManager';
import type {StorageAdapter} from './core/StorageAdapter';
import {GameData} from "@engine/types/EngineEventMap";
import {PlatformContainer, BrowserContainer} from "@engine/core/PlatformContainer";
import {RenderManager} from "@engine/core/RenderManager";
import {PluginManager} from './core/PluginManager';
import {SystemContainer, type SystemDefinition, type ISystemFactoryContext} from './core/SystemContainer';
import {createCoreSystemDefinitions, CORE_SYSTEMS} from './core/CoreSystemDefs';
import {createPlatformSystemDefinitions, PLATFORM_SYSTEMS, type PlatformSystemConfig, type IPlatformFactoryContext} from './core/PlatformSystemDefs';
import type {IPlatformAdapter} from './interfaces/IPlatformAdapter';
import {BrowserPlatformAdapter} from './platform/BrowserPlatformAdapter';
import type {IRenderer} from './types/RenderingTypes';

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
    systems: SystemConfig;
    gameState: Record<string, unknown>;
    gameData?: GameData;

    /**
     * Platform adapter (new, preferred way)
     * Provides platform-specific functionality (audio, rendering, input, storage)
     */
    platform?: IPlatformAdapter;

    /**
     * Platform container (old, deprecated way - kept for backward compatibility)
     * Will be converted to IPlatformAdapter internally
     */
    container?: PlatformContainer;

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
 *     systems: { audio: true, assets: true, save: true },
 *     gameState: myGameState
 * });
 *
 * // In game layer, cast to typed context:
 * const ctx = engine.context as TypedGameContext<MyGameState>;
 * ctx.game.player.health -= 10;
 * ```
 */
export class Engine implements ISerializationRegistry {
    public readonly config: Required<Pick<EngineConfig, 'debug' | 'targetFPS' | 'gameVersion'>>;
    public readonly context: GameContext;
    private readonly container: SystemContainer;
    private readonly platform: IPlatformAdapter;

    public serializableSystems: Map<string, ISerializable>;
    public migrationFunctions: Map<string, MigrationFunction>;

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;

    // Renderer registry (for RenderManager initialization)
    private renderers: Map<string, IRenderer> = new Map();

    private constructor(userConfig: EngineConfig) {
        this.config = {
            debug: userConfig.debug ?? false,
            targetFPS: userConfig.targetFPS ?? 60,
            gameVersion: userConfig.gameVersion ?? '1.0.0'
        };

        // Get or create platform adapter
        this.platform = this.resolvePlatform(userConfig);

        // Create SystemContainer (the ONLY DI container)
        this.container = new ExtendedSystemContainer(this.renderers);

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

        // Register core systems (platform-agnostic)
        const coreDefinitions = createCoreSystemDefinitions();
        for (const def of coreDefinitions) {
            this.container.register(def);
        }

        // Register platform-aware systems
        const platformConfig: PlatformSystemConfig = {
            assets: userConfig.systems.assets,
            audio: userConfig.systems.audio,
            effects: userConfig.systems.effects,
            renderer: userConfig.systems.renderer,
            input: userConfig.systems.input
        };
        const platformDefinitions = createPlatformSystemDefinitions(this.platform, platformConfig);
        for (const def of platformDefinitions) {
            this.container.register(def);
        }

        // Initialize all non-lazy systems
        this.container.initializeAll();

        // Inject context into StateManager
        this.stateManager.setContext(this.context);

        // Wire context to systems (readonly references)
        this.wireContext();

        // Create SaveManager now that Engine exists
        if (userConfig.systems.save !== false) {
            const eventBus = this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
            const saveManager = new SaveManager(
                eventBus,
                this,
                userConfig.storageAdapter
            );
            this.container.registerInstance(Symbol('SaveManager'), saveManager);
            (this.context as any).save = saveManager;
        }

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

        // Load game data if provided
        if (userConfig.gameData) {
            this.loadGameData(userConfig.gameData);
        }
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

        // Old API: convert PlatformContainer to IPlatformAdapter
        if (config.container) {
            const containerElement = config.container.getDomElement?.();
            if (!containerElement) {
                throw new Error('[Engine] PlatformContainer must provide getDomElement() for backward compatibility');
            }

            return new BrowserPlatformAdapter({
                containerElement,
                renderType: 'auto',
                audio: config.systems.audio !== false,
                input: config.systems.input !== false
            });
        }

        throw new Error('[Engine] Must provide either platform or container in config');
    }

    /**
     * Static factory - THE ONLY WAY to create an Engine
     *
     * This ensures proper initialization order and unlocks audio
     */
    static async create(config: EngineConfig): Promise<Engine> {
        const engine = new Engine(config);

        // Unlock audio if AudioManager is enabled
        if (engine.container.has(PLATFORM_SYSTEMS.AudioManager)) {
            await engine.audio.unlockAudio();
        }

        engine.log('Engine created successfully');

        return engine;
    }

    /**
     * Wire context to system references (readonly)
     * @private
     */
    private wireContext(): void {
        const ctx = this.context;

        if (this.container.has(PLATFORM_SYSTEMS.AudioManager)) {
            ctx.audio = this.container.get(PLATFORM_SYSTEMS.AudioManager);
        }
        if (this.container.has(PLATFORM_SYSTEMS.AssetManager)) {
            ctx.assets = this.container.get(PLATFORM_SYSTEMS.AssetManager);
        }
        if (this.container.has(PLATFORM_SYSTEMS.EffectManager)) {
            ctx.effects = this.container.get(PLATFORM_SYSTEMS.EffectManager);
        }
        if (this.container.has(PLATFORM_SYSTEMS.InputManager)) {
            ctx.input = this.container.get(PLATFORM_SYSTEMS.InputManager);
        }
        if (this.container.has(PLATFORM_SYSTEMS.RenderManager)) {
            ctx.renderer = this.container.get(PLATFORM_SYSTEMS.RenderManager);
            ctx.renderManager = this.container.get(PLATFORM_SYSTEMS.RenderManager);
        }
        if (this.container.has(Symbol('Localization'))) {
            ctx.loc = this.container.get(Symbol('Localization'));
        }
    }

    // ========================================================================
    // TYPED SYSTEM GETTERS (for IDE autocomplete)
    // ========================================================================

    get eventBus(): EventBus {
        return this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
    }

    get audio(): AudioManager {
        return this.container.get<AudioManager>(PLATFORM_SYSTEMS.AudioManager);
    }

    get assets(): AssetManager {
        return this.container.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
    }

    get save(): SaveManager {
        return this.container.get<SaveManager>(Symbol('SaveManager'));
    }

    get stateManager(): GameStateManager {
        return this.container.get<GameStateManager>(CORE_SYSTEMS.StateManager);
    }

    get sceneManager(): SceneManager {
        return this.container.get<SceneManager>(CORE_SYSTEMS.SceneManager);
    }

    get actionRegistry(): ActionRegistry {
        return this.container.get<ActionRegistry>(CORE_SYSTEMS.ActionRegistry);
    }

    get effectManager(): EffectManager | undefined {
        return this.container.getOptional<EffectManager>(PLATFORM_SYSTEMS.EffectManager);
    }

    get inputManager(): InputManager | undefined {
        return this.container.getOptional<InputManager>(PLATFORM_SYSTEMS.InputManager);
    }

    get pluginManager(): PluginManager {
        return this.container.get<PluginManager>(CORE_SYSTEMS.PluginManager);
    }

    // Temporary bridge for old code that uses registry
    get registry(): any {
        return {
            get: <T>(key: symbol) => this.container.get<T>(key),
            getOptional: <T>(key: symbol) => this.container.getOptional<T>(key),
            has: (key: symbol) => this.container.has(key)
        };
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
     * Pre-load assets from a manifest before starting the game
     */
    async preload(manifest: AssetManifestEntry[]): Promise<void> {
        this.log(`Preloading ${manifest.length} assets...`);
        await this.assets.loadManifest(manifest);
        this.log('Asset preloading complete.');
    }

    // ========================================================================
    // ENGINE LIFECYCLE
    // ========================================================================

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

        requestAnimationFrame(() => this.gameLoop());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
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

    stop(): void {
        this.log('Stopping engine...');
        this.isRunning = false;
        this.eventBus.emit('engine.stopped', {});
    }

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

    log(...args: any[]): void {
        if (this.config.debug) {
            console.log('[Engine]', ...args);
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
            console.warn(`[Engine] Serializable system key '${key}' already registered. Overwriting.`);
        }
        this.serializableSystems.set(key, system);
    }

    unregisterSerializableSystem(key: string): void {
        this.serializableSystems.delete(key);
    }

    registerMigration(fromVersion: string, toVersion: string, migration: MigrationFunction): void {
        const key = `${fromVersion}_to_${toVersion}`;
        if (this.migrationFunctions.has(key)) {
            console.warn(`[Engine] Migration function '${key}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(key, migration);
    }

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    getCurrentStateName(): string | null {
        return this.stateManager.getCurrentStateName();
    }

    getCurrentScene(): any {
        return this.sceneManager.getCurrentScene();
    }
}

/**
 * ExtendedSystemContainer - Adds renderer registration to SystemContainer
 *
 * This allows RenderManager initialization to register renderers.
 */
class ExtendedSystemContainer extends SystemContainer implements IPlatformFactoryContext {
    constructor(private renderers: Map<string, IRenderer>) {
        super();
    }

    registerRenderer(type: string, renderer: IRenderer): void {
        this.renderers.set(type, renderer);
    }

    getRenderer(type: string): IRenderer {
        const renderer = this.renderers.get(type);
        if (!renderer) {
            throw new Error(`[ExtendedSystemContainer] Renderer '${type}' not found`);
        }
        return renderer;
    }
}
