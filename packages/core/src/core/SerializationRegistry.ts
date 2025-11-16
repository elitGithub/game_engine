import type { ISerializable, ISerializationRegistry, MigrationFunction, GameContext } from '@game-engine/core/types';
import type { SceneManager } from '@game-engine/core/systems/SceneManager';
import type { ILogger } from '@game-engine/core/interfaces';

/**
 * SerializationRegistry - Centralized registry for save/load system
 *
 * This class decouples the SaveManager from the Engine by providing
 * a dedicated service for managing serializable systems, migrations,
 * and scene state coordination.
 *
 * Architecture:
 * - SaveManager depends on SerializationRegistry (not Engine)
 * - SerializationRegistry depends on SceneManager for scene state
 * - Engine registers systems with SerializationRegistry via public API
 *
 * This maintains clean dependency flow: SaveManager -> Registry -> SceneManager
 */
export class SerializationRegistry implements ISerializationRegistry {
    private readonly serializableSystems: Map<string, ISerializable>;
    private readonly migrationFunctions: Map<string, MigrationFunction>;
    public readonly gameVersion: string;
    private context?: GameContext;

    constructor(
        private readonly sceneManager: SceneManager,
        gameVersion: string,
        private readonly logger: ILogger
    ) {
        this.gameVersion = gameVersion;
        this.serializableSystems = new Map();
        this.migrationFunctions = new Map();
    }

    /**
     * Set the GameContext reference
     * Called by Engine after context is created
     */
    setContext(context: GameContext): void {
        this.context = context;
    }

    /**
     * Get the current scene ID from SceneManager
     */
    getCurrentSceneId(): string {
        const currentScene = this.sceneManager.getCurrentScene();
        return currentScene?.sceneId || '';
    }

    /**
     * Restore a scene by ID via SceneManager
     *
     * Requires GameContext to be set via setContext() first.
     */
    restoreScene(sceneId: string): void {
        if (!this.context) {
            this.logger.error('[SerializationRegistry] Cannot restore scene: Context not set. Call setContext() first.');
            return;
        }

        this.sceneManager.goToScene(sceneId, this.context);
    }

    /**
     * Register a system as serializable
     */
    registerSerializable(key: string, system: ISerializable): void {
        if (this.serializableSystems.has(key)) {
            this.logger.warn(`[SerializationRegistry] System '${key}' already registered. Overwriting.`);
        }
        this.serializableSystems.set(key, system);
    }

    /**
     * Unregister a serializable system
     */
    unregisterSerializable(key: string): void {
        if (this.serializableSystems.has(key)) {
            this.serializableSystems.delete(key);
            this.logger.log(`[SerializationRegistry] Unregistered: ${key}`);
        } else {
            this.logger.warn(`[SerializationRegistry] Cannot unregister '${key}' - not found`);
        }
    }

    /**
     * Register a migration function for a specific version
     */
    registerMigration(version: string, migrationFn: MigrationFunction): void {
        if (this.migrationFunctions.has(version)) {
            this.logger.warn(`[SerializationRegistry] Migration for version '${version}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(version, migrationFn);
    }

    /**
     * Get a serializable system by key
     */
    getSerializable(key: string): ISerializable | undefined {
        return this.serializableSystems.get(key);
    }

    /**
     * Check if a serializable system is registered
     */
    hasSerializable(key: string): boolean {
        return this.serializableSystems.has(key);
    }

    /**
     * Get all registered serializable systems as a read-only map
     *
     * Returns a ReadonlyMap view that prevents external mutation while
     * allowing iteration and lookup operations.
     */
    getAllSerializables(): ReadonlyMap<string, ISerializable> {
        return this.serializableSystems;
    }

    /**
     * Get all registered migration functions as a read-only map
     *
     * Returns a ReadonlyMap view that prevents external mutation while
     * allowing iteration and lookup operations.
     */
    getAllMigrations(): ReadonlyMap<string, MigrationFunction> {
        return this.migrationFunctions;
    }
}
