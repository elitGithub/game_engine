// engine/Engine.ts
import type {GameConfig, GameContext, GameData, StateData, ISerializable, MigrationFunction} from '@engine/types';
import {EventBus, eventBus} from './core/EventBus';
import {GameStateManager} from './core/GameStateManager';
import {SceneManager} from './systems/SceneManager';
import {ActionRegistry} from './systems/ActionRegistry';
import {SaveManager, ISerializationRegistry} from './systems/SaveManager';
import {AudioManager} from './systems/AudioManager';
import {EffectManager} from './systems/EffectManager';
import {InputManager} from './systems/InputManager';
import type {StorageAdapter} from './core/StorageAdapter';
import type {AudioSourceAdapter, AudioAssetMap} from './core/AudioSourceAdapter';

export interface EngineConfig {
    debug?: boolean;
    targetFPS?: number;
    audioAssets?: AudioAssetMap;
    autoSceneMusic?: boolean;
    gameVersion?: string;
}

export class Engine implements ISerializationRegistry {
    public config: {
        debug: boolean;
        targetFPS: number;
        audioAssets: AudioAssetMap;
        autoSceneMusic: boolean;
        gameVersion: string;
    };
    public eventBus: EventBus;
    public stateManager: GameStateManager;
    public sceneManager: SceneManager;
    public actionRegistry: ActionRegistry;
    public saveManager: SaveManager;
    public audioManager: AudioManager;
    public effectManager?: EffectManager;
    public inputManager?: InputManager;
    public context: GameContext;

    public serializableSystems: Map<string, ISerializable>;
    public migrationFunctions: Map<string, MigrationFunction>;

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;

    constructor(
        config: EngineConfig = {},
        containerElement?: HTMLElement,
        storageAdapter?: StorageAdapter,
        audioSourceAdapter?: AudioSourceAdapter
    ) {
        this.config = {
            debug: config.debug || false,
            targetFPS: config.targetFPS || 60,
            audioAssets: config.audioAssets || {},
            autoSceneMusic: config.autoSceneMusic !== false,
            gameVersion: config.gameVersion || '1.0.0',
        };

        this.eventBus = eventBus;
        this.stateManager = new GameStateManager();
        this.sceneManager = new SceneManager(this.eventBus);
        this.actionRegistry = new ActionRegistry();
        this.serializableSystems = new Map();
        this.migrationFunctions = new Map();

        this.isRunning = false;
        this.isPaused = false;

        this.lastFrameTime = 0;
        this.frameCount = 0;

        this.context = {
            flags: new Set<string>(),
            variables: new Map<string, any>(),
        };

        this.saveManager = new SaveManager(this.eventBus, this, storageAdapter);
        this.context.saveManager = this.saveManager;

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

        this.audioManager = new AudioManager(this.eventBus, audioSourceAdapter, this.config.audioAssets);
        this.context.audio = this.audioManager;

        if (containerElement) {
            this.effectManager = new EffectManager(containerElement);
            this.context.effects = this.effectManager;

            this.inputManager = new InputManager(this.stateManager, this.eventBus);
            this.context.input = this.inputManager;
        }

        if (this.config.autoSceneMusic) {
            this.setupAutoSceneMusic();
        }

        this.log('Engine initialized');
    }

    public registerSerializableSystem(key: string, system: ISerializable): void {
        if (this.serializableSystems.has(key)) {
            console.warn(`[Engine] Serializable system key '${key}' already registered. Overwriting.`);
        }
        this.serializableSystems.set(key, system);
    }

    public registerMigration(fromVersion: string, toVersion: string, migration: MigrationFunction): void {
        const key = `${fromVersion}_to_${toVersion}`;
        if (this.migrationFunctions.has(key)) {
            console.warn(`[Engine] Migration function '${key}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(key, migration);
    }

    get gameVersion(): string {
        return this.config.gameVersion;
    }

    getCurrentSceneId(): string {
        return this.sceneManager.getCurrentScene()?.sceneId || '';
    }

    restoreScene(sceneId: string): void {
        this.sceneManager.goToScene(sceneId, this.context);
    }

    private setupAutoSceneMusic(): void {
        this.eventBus.on('scene.changed', (data: any) => {
            const scene = this.sceneManager.getScene(data.sceneId);
            if (!scene) return;

            if (scene.sceneData.music) {
                const musicConfig = typeof scene.sceneData.music === 'string'
                    ? {track: scene.sceneData.music, loop: true, fadeIn: 1}
                    : scene.sceneData.music;

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
            } else if (scene.sceneData.stopMusic) {
                this.audioManager.stopMusic(scene.sceneData.musicFadeOut || 1);
            }
        });
    }


    loadGameData(gameData: GameData): void {
        this.log('Loading game data...');

        if (gameData.scenes) {
            this.sceneManager.loadScenes(gameData.scenes);
        }

        this.eventBus.emit('game.data.loaded', gameData);
    }

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
        this.isPaused = true;
        this.eventBus.emit('engine.paused', {});
    }

    unpause(): void {
        this.isPaused = false;
        this.eventBus.emit('engine.unpaused', {});
    }

    log(...args: any[]): void {
        if (this.config.debug) {
            console.log('[Engine]', ...args);
        }
    }

    getCurrentStateName(): string | null {
        return this.stateManager.getCurrentStateName();
    }

    getCurrentScene(): any {
        return this.sceneManager.getCurrentScene();
    }
}