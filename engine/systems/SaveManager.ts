// engine/systems/SaveManager.ts
import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';
import type { EventBus } from '../core/EventBus';
import type { ISerializationRegistry } from '../types';
import { MigrationManager } from "./MigrationManager";
import { ILogger, ITimerProvider } from "@engine/interfaces";

export interface SaveData {
    version: string;
    timestamp: number;
    currentSceneId: string;
    systems: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

/**
 * SaveManager - robust save/load system with Map/Set support
 *
 * Automatically handles Map and Set serialization so plugins don't have to.
 */
export class SaveManager {
    private migrationManager: MigrationManager;

    constructor(
        private eventBus: EventBus,
        private registry: ISerializationRegistry,
        private adapter: StorageAdapter,
        private timeAdapter: ITimerProvider,
        private logger: ILogger
    ) {
        this.migrationManager = new MigrationManager(this.registry.migrationFunctions, this.logger);
    }

    /**
     * Save the current game state.
     * Uses a custom replacer to serialize Map and Set objects natively.
     */
    async saveGame(slotId: string, metadata?: Record<string, unknown>): Promise<boolean> {
        try {
            const saveData = this.serializeGameState(metadata);

            // MAGIC HAPPENS HERE: The replacer handles complex types automatically
            const json = JSON.stringify(saveData, this.replacer);

            const success = await this.adapter.save(slotId, json);

            if (success) {
                this.eventBus.emit('save.completed', {
                    slotId,
                    timestamp: saveData.timestamp
                });
            }

            return success;
        } catch (error) {
            this.logger.error('[SaveManager] Save failed:', error);
            this.eventBus.emit('save.failed', { slotId, error });
            return false;
        }
    }

    /**
     * Load a saved game.
     * Uses a custom reviver to restore Map and Set objects natively.
     */
    async loadGame(slotId: string): Promise<boolean> {
        try {
            const json = await this.adapter.load(slotId);
            if (!json) return false;

            // MAGIC HAPPENS HERE: The reviver restores Maps/Sets before migration runs
            let saveData: SaveData = JSON.parse(json, this.reviver);

            saveData = this.migrationManager.migrate(saveData, this.registry.gameVersion);

            this.restoreGameState(saveData);

            this.eventBus.emit('save.loaded', {
                slotId,
                timestamp: saveData.timestamp
            });
            return true;
        } catch (error) {
            this.logger.error('[SaveManager] Load failed:', error);
            this.eventBus.emit('save.loadFailed', { slotId, error });
            return false;
        }
    }

    // ========================================================================
    // SERIALIZATION HELPERS
    // ========================================================================

    /**
     * JSON Replacer: Converts Map/Set to serializable objects with type tags
     */
    private replacer(key: string, value: unknown): unknown {
        if (value instanceof Map) {
            return {
                $type: 'Map',
                value: Array.from(value.entries())
            };
        }
        if (value instanceof Set) {
            return {
                $type: 'Set',
                value: Array.from(value)
            };
        }
        return value;
    }

    /**
     * JSON Reviver: Restores Map/Set from tagged objects
     */
    private reviver(key: string, value: unknown): unknown {
        if (typeof value === 'object' && value !== null) {
            // Cast to any to check for our special properties safely
            const typedValue = value as { $type?: string; value: any };

            if (typedValue.$type === 'Map') {
                return new Map(typedValue.value);
            }
            if (typedValue.$type === 'Set') {
                return new Set(typedValue.value);
            }
        }
        return value;
    }

    // ========================================================================
    // CORE LOGIC (Unchanged)
    // ========================================================================

    async deleteSave(slotId: string): Promise<boolean> {
        const success = await this.adapter.delete(slotId);
        if (success) {
            this.eventBus.emit('save.deleted', { slotId });
        }
        return success;
    }

    async listSaves(): Promise<SaveSlotMetadata[]> {
        return await this.adapter.list();
    }

    private serializeGameState(metadata?: Record<string, unknown>): SaveData {
        const systemsData: Record<string, unknown> = {};

        for (const [key, system] of this.registry.serializableSystems.entries()) {
            try {
                // Plugins can now just return { myMap: this.map } directly!
                systemsData[key] = system.serialize();
            } catch (error) {
                this.logger.error(`[SaveManager] Failed to serialize system '${key}':`, error);
            }
        }

        return {
            version: this.registry.gameVersion,
            timestamp: this.timeAdapter.now(),
            currentSceneId: this.registry.getCurrentSceneId(),
            systems: systemsData,
            metadata: metadata || {}
        };
    }

    private restoreGameState(saveData: SaveData): void {
        if (saveData.systems) {
            for (const [key, data] of Object.entries(saveData.systems)) {
                const system = this.registry.serializableSystems.get(key);
                if (system) {
                    try {
                        system.deserialize(data);
                    } catch (error) {
                        this.logger.error(`[SaveManager] Failed to deserialize system '${key}':`, error);
                    }
                } else {
                    this.logger.warn(`[SaveManager] Found save data for unknown system '${key}'. Skipping.`);
                }
            }
        }

        if (saveData.currentSceneId) {
            this.registry.restoreScene(saveData.currentSceneId);
        }
    }
}