import type {
    GameContext,
    GameData,
    StateData,
    ISerializable,
    MigrationFunction,
    ISerializationRegistry
} from '@engine/types';
import {EventBus} from './core/EventBus';
import {GameStateManager} from './core/GameStateManager';
import {SceneManager} from './systems/SceneManager';
import {ActionRegistry} from './systems/ActionRegistry';
import {SaveManager} from './systems/SaveManager';
import {AudioManager} from './systems/AudioManager';
import {EffectManager} from './systems/EffectManager';
import {InputManager} from './systems/InputManager';
import {SystemRegistry, SYSTEMS} from './core/SystemRegistry';
import {SystemFactory, type SystemConfig} from './core/SystemFactory';
import {PluginManager} from './core/PluginManager';
import type {AssetManager} from './systems/AssetManager';
import type {AssetManifestEntry} from './systems/AssetManager';
import type {StorageAdapter} from './core/StorageAdapter';

export interface EngineConfig<TGame> {
    debug?: boolean;
    targetFPS?: number;
    gameVersion?: string;
    systems: SystemConfig;
    gameState: TGame;
    gameData?: GameData;
    containerElement?: HTMLElement;
    storageAdapter?: StorageAdapter;
}

/**
 * Engine - Clean, type-safe, config-driven game engine
 *
 * Usage:
 *   const engine = await Engine.create<MyGameState>({
 *       systems: { audio: true, assets: true, save: true },
 *       gameState: myGameState
 *   });
 *
 *   await engine.audio.playSound('click');
 *   engine.context.game.player.health -= 10;
 */
export class Engine<TGame = Record<string, any>> implements ISerializationRegistry {
    public readonly config: Required<Pick<EngineConfig<TGame>, 'debug' | 'targetFPS' | 'gameVersion'>>;
    public readonly registry: SystemRegistry;
    public readonly context: GameContext;

    public serializableSystems: Map<string, ISerializable>;
    public migrationFunctions: Map<string, MigrationFunction>;

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;

    private constructor(userConfig: EngineConfig<TGame>) {
        this.config = {
            debug: userConfig.debug ?? false,
            targetFPS: userConfig.targetFPS ?? 60,
            gameVersion: userConfig.gameVersion ?? '1.0.0'
        };

        // Create registry
        this.registry = new SystemRegistry();

        // Initialize serializablecontext with typed game state
        this.context = {
            game: userConfig.gameState,
            flags: new Set(),
            variables: new Map()
        } as GameContext;

        // Serialization support
        this.serializableSystems = new Map();
        this.migrationFunctions = new Map();
        this.isRunning = false;
        this.isPaused = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;

        // Create systems from config using factory
        SystemFactory.create(
            userConfig.systems,
            this.registry,
            userConfig.containerElement
        );

        // Inject context into StateManager
        this.stateManager.setContext(this.context);

        // Wire context to systems (readonly references)
        this.wireContext();

        // Create SaveManager now that Engine exists
        if (userConfig.systems.save !== false) {
            const eventBus = this.registry.get<EventBus>(SYSTEMS.EventBus);
            const saveManager = new SaveManager(
                eventBus,
                this,
                userConfig.storageAdapter
            );
            this.registry.register(SYSTEMS.SaveManager, saveManager);
            (this.context as any).save = saveManager;
        }

        // Register core engine state as serializable
        this.registerSerializableSystem('_core', {
            serialize: () => ({
                flags: Array.from(this.context.flags),
                variables: Array.from(this.context.variables.entries()),
            }),
            deserialize: (data) => {
                this.context.flags = new Set(data.flags || []);
                this.context.variables = new Map(data.variables || []);
            },
        });

        // Load game data if provided
        if (userConfig.gameData) {
            this.loadGameData(userConfig.gameData);
        }
    }

    /**
     * Static factory - THE ONLY WAY to create an Engine
     *
     * This ensures proper initialization order and unlocks audio
     */
    static async create<TGame>(config: EngineConfig<TGame>): Promise<Engine<TGame>> {
        const engine = new Engine(config);

        // Unlock audio if AudioManager is enabled
        if (engine.registry.has(SYSTEMS.AudioManager)) {
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
        const ctx = this.context as any;

        if (this.registry.has(SYSTEMS.AudioManager)) {
            ctx.audio = this.registry.get(SYSTEMS.AudioManager);
        }
        if (this.registry.has(SYSTEMS.AssetManager)) {
            ctx.assets = this.registry.get(SYSTEMS.AssetManager);
        }
        if (this.registry.has(SYSTEMS.EffectManager)) {
            ctx.effects = this.registry.get(SYSTEMS.EffectManager);
        }
        if (this.registry.has(SYSTEMS.InputManager)) {
            ctx.input = this.registry.get(SYSTEMS.InputManager);
        }

        if (this.registry.has(SYSTEMS.RenderManager)) {
            ctx.renderer = this.registry.get(SYSTEMS.RenderManager);
        }
    }

    // ========================================================================
    // TYPED SYSTEM GETTERS (for IDE autocomplete)
    // ========================================================================

    get eventBus(): EventBus {
        return this.registry.get<EventBus>(SYSTEMS.EventBus);
    }

    get audio(): AudioManager {
        return this.registry.get<AudioManager>(SYSTEMS.AudioManager);
    }

    get assets(): AssetManager {
        return this.registry.get<AssetManager>(SYSTEMS.AssetManager);
    }

    get save(): SaveManager {
        return this.registry.get<SaveManager>(SYSTEMS.SaveManager);
    }

    get stateManager(): GameStateManager {
        return this.registry.get<GameStateManager>(SYSTEMS.StateManager);
    }

    get sceneManager(): SceneManager {
        return this.registry.get<SceneManager>(SYSTEMS.SceneManager);
    }

    get actionRegistry(): ActionRegistry {
        return this.registry.get<ActionRegistry>(SYSTEMS.ActionRegistry);
    }

    get effectManager(): EffectManager | undefined {
        return this.registry.getOptional<EffectManager>(SYSTEMS.EffectManager);
    }

    get inputManager(): InputManager | undefined {
        return this.registry.getOptional<InputManager>(SYSTEMS.InputManager);
    }

    get pluginManager(): PluginManager {
        return this.registry.get<PluginManager>(SYSTEMS.PluginManager);
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

            this.stateManager.render(this.context.renderer || null);
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

        if (this.registry.has(SYSTEMS.AudioManager)) {
            const audioContext = (this.registry as any)._audioContext;
            if (audioContext) {
                audioContext.suspend();
            }
        }

        this.eventBus.emit('engine.paused', {});
    }

    unpause(): void {
        if (!this.isPaused) return;
        this.isPaused = false;

        if (this.registry.has(SYSTEMS.AudioManager)) {
            const audioContext = (this.registry as any)._audioContext;
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