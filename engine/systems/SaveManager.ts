// engine/systems/SaveManager.ts
import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';
import type { EventBus } from '../core/EventBus';
import type {ISerializationRegistry} from '../types';
import { MigrationManager } from "./MigrationManager";
import {ILogger, ITimerProvider} from "@engine/interfaces";

export interface SaveData {
    version: string;
    timestamp: number;
    currentSceneId: string;
    systems: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

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
     * Save the current game state to a storage slot.
     * Serializes all registered systems, applies migrations if needed.
     * Emits 'save.completed' on success or 'save.failed' on error.
     *
     * @param slotId - Unique identifier for the save slot
     * @param metadata - Optional additional data to store with the save
     * @returns Promise that resolves to true if save succeeded, false otherwise
     */
    async saveGame(slotId: string, metadata?: Record<string, unknown>): Promise<boolean> {
        try {
            const saveData = this.serializeGameState(metadata);
            const json = JSON.stringify(saveData);
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
     * Load a saved game from a storage slot.
     * Deserializes all registered systems, applies migrations if needed.
     * Emits 'save.loaded' on success or 'save.loadFailed' on error.
     *
     * @param slotId - Unique identifier of the save slot to load
     * @returns Promise that resolves to true if load succeeded, false otherwise
     */
    async loadGame(slotId: string): Promise<boolean> {
        try {
            const json = await this.adapter.load(slotId);
            if (!json) return false;

            let saveData: SaveData = JSON.parse(json);
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

    /**
     * Delete a saved game from the specified slot.
     * Emits a 'save.deleted' event if the deletion is successful.
     *
     * @param slotId - The unique identifier of the save slot to delete
     * @returns A promise that resolves to true if the save was deleted successfully, false otherwise
     */
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
