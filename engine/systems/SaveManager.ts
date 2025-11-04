/**
 * SaveManager - Handles game save/load with configurable storage backend
 */
import type { Engine } from '../Engine';
import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';

export interface SaveData {
    timestamp: number;
    currentSceneId: string;
    /**
     * Contains saved data from all registered ISerializable systems.
     * The key is the system's unique key (e.g., 'player', 'clock', '_core')
     */
    systems: {
        [key: string]: any;
    };
    metadata?: {
        [key: string]: any;
    };
}

export class SaveManager {
    private engine: Engine;
    private adapter: StorageAdapter;

    constructor(engine: Engine, adapter?: StorageAdapter) {
        this.engine = engine;
        this.adapter = adapter || new LocalStorageAdapter();
    }

    /**
     * Save current game state to a slot
     */
    async saveGame(slotId: string, metadata?: any): Promise<boolean> {
        try {
            const saveData = this.serializeGameState(metadata);
            const json = JSON.stringify(saveData);
            const success = await this.adapter.save(slotId, json);

            if (success) {
                this.engine.eventBus.emit('save.completed', { slotId, timestamp: saveData.timestamp });
            }

            return success;
        } catch (error) {
            console.error('[SaveManager] Save failed:', error);
            this.engine.eventBus.emit('save.failed', { slotId, error });
            return false;
        }
    }

    /**
     * Load game state from a slot
     */
    async loadGame(slotId: string): Promise<boolean> {
        try {
            const json = await this.adapter.load(slotId);
            if (!json) return false;

            const saveData: SaveData = JSON.parse(json);
            this.restoreGameState(saveData);

            this.engine.eventBus.emit('save.loaded', { slotId, timestamp: saveData.timestamp });
            return true;
        } catch (error) {
            console.error('[SaveManager] Load failed:', error);
            this.engine.eventBus.emit('save.loadFailed', { slotId, error });
            return false;
        }
    }

    /**
     * Delete a save slot
     */
    async deleteSave(slotId: string): Promise<boolean> {
        const success = await this.adapter.delete(slotId);
        if (success) {
            this.engine.eventBus.emit('save.deleted', { slotId });
        }
        return success;
    }

    /**
     * List all available save slots
     */
    async listSaves(): Promise<SaveSlotMetadata[]> {
        return await this.adapter.list();
    }

    /**
     * Serialize current game state by iterating over registered systems
     */
    private serializeGameState(metadata?: any): SaveData {
        const currentScene = this.engine.sceneManager.getCurrentScene();
        const systemsData: { [key: string]: any } = {};

        // Iterate over all registered systems and serialize them
        for (const [key, system] of this.engine.serializableSystems.entries()) {
            try {
                systemsData[key] = system.serialize();
            } catch (error) {
                console.error(`[SaveManager] Failed to serialize system '${key}':`, error);
            }
        }

        return {
            timestamp: Date.now(),
            currentSceneId: currentScene?.id || '',
            systems: systemsData, // Store the dynamic systems data
            metadata: metadata || {}
        };
    }

    /**
     * Restore game state by iterating over saved system data
     */
    private restoreGameState(saveData: SaveData): void {
        // Restore all registered systems
        if (saveData.systems) {
            for (const [key, data] of Object.entries(saveData.systems)) {
                const system = this.engine.serializableSystems.get(key);
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

        // Transition to saved scene
        if (saveData.currentSceneId) {
            this.engine.sceneManager.goToScene(saveData.currentSceneId, this.engine.context);
        }
    }
}