/**
 * Engine - The main game engine
 */
import type { GameConfig, GameContext, GameData, StateData } from '@types/index';
import { EventBus, eventBus } from './core/EventBus';
import { GameStateManager } from './core/GameStateManager';
import { SceneManager } from './systems/SceneManager';
import { ActionRegistry } from './systems/ActionRegistry';
import { SaveManager } from './core/SaveManager';
import type { StorageAdapter } from './core/StorageAdapter';

export class Engine {
    public config: Required<GameConfig>;
    public eventBus: EventBus;
    public stateManager: GameStateManager;
    public sceneManager: SceneManager;
    public actionRegistry: ActionRegistry;
    public saveManager: SaveManager;
    public context: GameContext;

    public isRunning: boolean;
    public isPaused: boolean;

    private lastFrameTime: number;
    private frameCount: number;

    constructor(config: GameConfig = {}, storageAdapter?: StorageAdapter) {
        this.config = {
            debug: config.debug || false,
            targetFPS: config.targetFPS || 60,
        };

        // Core systems
        this.eventBus = eventBus;
        this.stateManager = new GameStateManager();
        this.sceneManager = new SceneManager();
        this.actionRegistry = new ActionRegistry();

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

        this.log('Engine initialized');
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

        // Enter initial state
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
            // Update current state
            this.stateManager.update(deltaTime);

            // Render current state
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
     * Handle user input
     */
    handleInput(input: string): void {
        this.stateManager.handleInput(input);
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