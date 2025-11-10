// engine/systems/SaveManager.ts
import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';
import type { EventBus } from '../core/EventBus';
import type {ISerializationRegistry} from '../types';
import { MigrationManager } from "./MigrationManager";

export interface SaveData {
    version: string;
    timestamp: number;
    currentSceneId: string;
    systems: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export class SaveManager {
    private eventBus: EventBus;
    private registry: ISerializationRegistry;
    private adapter: StorageAdapter;
    private migrationManager: MigrationManager;

    constructor(
        eventBus: EventBus,
        registry: ISerializationRegistry,
        adapter: StorageAdapter
    ) {
        this.eventBus = eventBus;
        this.registry = registry;
        this.adapter = adapter;
        this.migrationManager = new MigrationManager(this.registry.migrationFunctions);
    }

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
            console.error('[SaveManager] Save failed:', error);
            this.eventBus.emit('save.failed', { slotId, error });
            return false;
        }
    }

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
            console.error('[SaveManager] Load failed:', error);
            this.eventBus.emit('save.loadFailed', { slotId, error });
            return false;
        }
    }

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
                console.error(`[SaveManager] Failed to serialize system '${key}':`, error);
            }
        }

        return {
            version: this.registry.gameVersion,
            timestamp: Date.now(),
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
                        console.error(`[SaveManager] Failed to deserialize system '${key}':`, error);
                    }
                } else {
                    console.warn(`[SaveManager] Found save data for unknown system '${key}'. Skipping.`);
                }
            }
        }

        if (saveData.currentSceneId) {
            this.registry.restoreScene(saveData.currentSceneId);
        }
    }
}
