/**
 * Engine - The main game engine
 */
import type { GameConfig, GameContext, GameData, StateData, ISerializable, MigrationFunction } from '@types/index';
import { EventBus, eventBus } from './core/EventBus';
import { GameStateManager } from './core/GameStateManager';
import { SceneManager } from './systems/SceneManager';
import { ActionRegistry } from './systems/ActionRegistry';
import { SaveManager } from './systems/SaveManager';
import { AudioManager } from './systems/AudioManager';
import { EffectManager } from './systems/EffectManager';
import type { StorageAdapter } from './core/StorageAdapter';
import type { AudioSourceAdapter, AudioAssetMap } from './core/AudioSourceAdapter';

export interface EngineConfig {
    debug?: boolean;
    targetFPS?: number;
    audioAssets?: AudioAssetMap;
    autoSceneMusic?: boolean;
    gameVersion?: string; // Added for save versioning
}

export class Engine {
    public config: {
        debug: boolean;
        targetFPS: number;
        audioAssets: AudioAssetMap;
        autoSceneMusic: boolean;
        gameVersion: string; // Added for save versioning
    };
    public eventBus: EventBus;
    public stateManager: GameStateManager;
    public sceneManager: SceneManager;
    public actionRegistry: ActionRegistry;
    public saveManager: SaveManager;
    public audioManager: AudioManager;
    public effectManager: EffectManager;
    public context: GameContext;

    public serializableSystems: Map<string, ISerializable>;
    public migrationFunctions: Map<string, MigrationFunction>; // Added for save versioning

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;

    constructor(
        config: EngineConfig = {},
        storageAdapter?: StorageAdapter,
        audioSourceAdapter?: AudioSourceAdapter
    ) {
        this.config = {
            debug: config.debug || false,
            targetFPS: config.targetFPS || 60,
            audioAssets: config.audioAssets || {},
            autoSceneMusic: config.autoSceneMusic !== false,
            gameVersion: config.gameVersion || '1.0.0', // Added for save versioning
        };

        // Core systems
        this.eventBus = eventBus;
        this.stateManager = new GameStateManager();
        this.sceneManager = new SceneManager();
        this.actionRegistry = new ActionRegistry();
        this.serializableSystems = new Map();
        this.migrationFunctions = new Map(); // Added for save versioning

        // Game state
        this.isRunning = false;
        this.isPaused = false;

        // Game loop tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;

        // Game context - shared data accessible to all systems
        this.context = {
            engine: this,
            player: undefined,
            flags: new Set<string>(),
            variables: new Map<string, any>(),
        };

        // Initialize SaveManager with optional custom storage adapter
        this.saveManager = new SaveManager(this, storageAdapter);

        // Add to context for easy access from Actions/Scenes
        this.context.saveManager = this.saveManager;

        // Register a "core" serializable system for flags and variables
        // so the SaveManager can handle them automatically.
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

        // Initialize AudioManager with optional custom audio source adapter
        this.audioManager = new AudioManager(this.eventBus, audioSourceAdapter, this.config.audioAssets);

        // Add to context for easy access from Actions/Scenes
        this.context.audio = this.audioManager;

        // Initialize EffectManager
        this.effectManager = new EffectManager(this.context);
        this.context.effects = this.effectManager;

        // Set up automatic scene music handling
        if (this.config.autoSceneMusic) {
            this.setupAutoSceneMusic();
        }

        this.log('Engine initialized');
    }

    /**
     * Registers a system (like Player, Inventory, Clock) with the SaveManager
     * @param key A unique string key to identify this system's data (e.g., 'player', 'clock')
     * @param system The system instance that implements ISerializable
     */
    public registerSerializableSystem(key: string, system: ISerializable): void {
        if (this.serializableSystems.has(key)) {
            console.warn(`[Engine] Serializable system key '${key}' already registered. Overwriting.`);
        }
        this.serializableSystems.set(key, system);
    }

    /**
     * Registers a migration function to update save data.
     * @param fromVersion The version to migrate *from* (e.g., '1.0.0')
     * @param toVersion The version to migrate *to* (e.g., '1.1.0')
     * @param migration The function that performs the migration
     */
    public registerMigration(fromVersion: string, toVersion: string, migration: MigrationFunction): void {
        const key = `${fromVersion}_to_${toVersion}`;
        if (this.migrationFunctions.has(key)) {
            console.warn(`[Engine] Migration function '${key}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(key, migration);
    }

    /**
     * Set up automatic music playback on scene changes
     */
    private setupAutoSceneMusic(): void {
        this.eventBus.on('scene.changed', (data) => {
            const scene = this.sceneManager.getScene(data.sceneId);
            if (!scene) return;

            // Check if scene has music data
            if (scene.data.music) {
                const musicConfig = typeof scene.data.music === 'string'
                    ? { track: scene.data.music, loop: true, fadeIn: 1 }
                    : scene.data.music;

                // Crossfade if currently playing music, otherwise just play
                if (this.audioManager.getMusicState() === 'playing') {
                    this.audioManager.crossfadeMusic(
                        musicConfig.track,
                        musicConfig.crossfade || 2
                    );
                } else {
                    this.audioManager.playMusic(
                        musicConfig.track,
                        musicConfig.loop !== false,
                        musicConfig.fadeIn || 0
                    );
                }
            } else if (scene.data.stopMusic) {
                // Stop music if scene specifies it
                this.audioManager.stopMusic(scene.data.musicFadeOut || 1);
            }
        });
    }

    /**
     * Load game data (scenes, etc.)
     */
    loadGameData(gameData: GameData): void {
        this.log('Loading game data...');

        if (gameData.scenes) {
            this.sceneManager.loadScenes(gameData.scenes);
        }

        this.eventBus.emit('game.data.loaded', gameData);
    }

    /**
     * Start the game engine
     */
    start(initialState: string, initialData: StateData = {}): void {
        this.log('Starting engine...');
        this.isRunning = true;

        // Enter initial state (now uses changeState)
        if (initialState) {
            this.stateManager.changeState(initialState, initialData);
        }

        // Start game loop
        this.lastFrameTime = performance.now();
        this.gameLoop();

        this.eventBus.emit('engine.started', {});
    }

/**
     * Main game loop
     */
    private gameLoop(): void {
        if (!this.isRunning) return;

        // Request next frame
        requestAnimationFrame(() => this.gameLoop());

        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        if (!this.isPaused) {
            // Update current state (only updates top of stack)
            this.stateManager.update(deltaTime);

            // Update effect manager
            this.effectManager.update(deltaTime);

            // Render current state (renders entire stack)
            this.stateManager.render(this.context.renderer || null);
        }

        this.frameCount++;
    }

    /**
     * Stop the engine
     */
    stop(): void {
        this.log('Stopping engine...');
        this.isRunning = false;
        this.eventBus.emit('engine.stopped', {});
    }

    /**
     * Pause/unpause the game
     */
    pause(): void {
        this.isPaused = true;
        this.eventBus.emit('engine.paused', {});
    }

    unpause(): void {
        this.isPaused = false;
        this.eventBus.emit('engine.unpaused', {});
    }

    /**
     * Debug logging
     */
    log(...args: any[]): void {
        if (this.config.debug) {
            console.log('[Engine]', ...args);
        }
    }

    /**
     * Get current game state name
     */
    getCurrentStateName(): string | null {
        return this.stateManager.getCurrentStateName();
    }

    /**
     * Get current scene
     */
    getCurrentScene(): any {
        return this.sceneManager.getCurrentScene();
    }
}