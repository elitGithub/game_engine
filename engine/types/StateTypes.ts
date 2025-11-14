// engine/types/StateTypes.ts

/**
 * StateTypes - Types for state management and serialization
 *
 * This file contains all types related to:
 * - State serialization and deserialization
 * - Save/load system infrastructure
 * - Data migration between versions
 */

/**
 * StateData - Generic state data container
 *
 * Represents arbitrary key-value state data that can be serialized.
 * Used throughout the engine for flexible state storage.
 */
export type StateData = Record<string, unknown>;

/**
 * ISerializable - Interface for objects that can be saved/loaded
 *
 * Any system that needs to persist state across save/load cycles
 * should implement this interface. The SaveManager will automatically
 * serialize all registered ISerializable systems.
 *
 * @example
 * ```typescript
 * class InventorySystem implements ISerializable {
 *   serialize(): unknown {
 *     return { items: this.items, gold: this.gold };
 *   }
 *
 *   deserialize(data: unknown): void {
 *     const state = data as { items: Item[], gold: number };
 *     this.items = state.items;
 *     this.gold = state.gold;
 *   }
 * }
 * ```
 */
export interface ISerializable {
    /**
     * Serialize the system's current state to a plain object
     *
     * @returns Serializable representation of the system's state
     */
    serialize(): unknown;

    /**
     * Restore the system's state from a previously serialized object
     *
     * @param data - Previously serialized state data
     */
    deserialize(data: unknown): void;
}

/**
 * MigrationFunction - Transforms save data from one version to another
 *
 * Used by the MigrationManager to update old save files to work with
 * newer game versions. Each migration function should handle one version
 * increment and return transformed data.
 *
 * @param data - Save data from the previous version
 * @returns Transformed data compatible with the current version
 *
 * @example
 * ```typescript
 * // Migration from v1.0.0 to v1.1.0
 * const migrateToV1_1: MigrationFunction = (data: unknown) => {
 *   const old = data as { player: { hp: number } };
 *   return {
 *     player: {
 *       health: old.player.hp, // Renamed 'hp' to 'health'
 *       maxHealth: 100 // Added new field
 *     }
 *   };
 * };
 * ```
 */
export type MigrationFunction = (data: unknown) => unknown;

/**
 * ISerializationRegistry - Central registry for save/load system
 *
 * Manages the collection of serializable systems and migration functions.
 * Provides the interface between SaveManager and the rest of the engine,
 * allowing SaveManager to remain decoupled from engine-specific details.
 *
 * Implemented by SerializationRegistry in engine/core.
 */
export interface ISerializationRegistry {
    /**
     * Map of all registered serializable systems
     *
     * Key: System identifier (e.g., "gameState", "inventory")
     * Value: System implementing ISerializable
     */
    serializableSystems: Map<string, ISerializable>;

    /**
     * Map of version migration functions
     *
     * Key: Target version string (e.g., "1.1.0")
     * Value: Migration function to transform data to that version
     */
    migrationFunctions: Map<string, MigrationFunction>;

    /**
     * Current game version
     *
     * Used to determine if save data needs migration
     */
    readonly gameVersion: string;

    /**
     * Get the current scene ID from the scene manager
     *
     * @returns Current scene ID or empty string if no scene is active
     */
    getCurrentSceneId(): string;

    /**
     * Restore a scene by ID after loading a save
     *
     * @param sceneId - ID of the scene to restore
     */
    restoreScene(sceneId: string): void;
}
