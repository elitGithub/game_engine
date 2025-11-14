import type { ISerializable, ISerializationRegistry, MigrationFunction, GameContext } from '@engine/types';
import type { SceneManager } from '@engine/systems/SceneManager';
import type { ILogger } from '@engine/interfaces';

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
    public readonly serializableSystems: Map<string, ISerializable>;
    public readonly migrationFunctions: Map<string, MigrationFunction>;
    public readonly gameVersion: string;
    private context?: GameContext;

    constructor(
        private sceneManager: SceneManager,
        gameVersion: string,
        private logger: ILogger
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
     * Register a migration function for a specific version
     */
    registerMigration(version: string, migrationFn: MigrationFunction): void {
        if (this.migrationFunctions.has(version)) {
            this.logger.warn(`[SerializationRegistry] Migration for version '${version}' already registered. Overwriting.`);
        }
        this.migrationFunctions.set(version, migrationFn);
    }
}
