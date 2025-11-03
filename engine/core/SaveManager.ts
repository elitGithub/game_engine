/**
 * SaveManager - Handles game save/load with configurable storage backend
 */
import type { Engine } from '../Engine';
import type { StorageAdapter, SaveSlotMetadata } from './StorageAdapter';
import { LocalStorageAdapter } from './LocalStorageAdapter';

export interface SaveData {
    timestamp: number;
    currentSceneId: string;
    context: {
        flags: string[];
        variables: [string, any][];
        player?: any;
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
     * Serialize current game state
     */
    private serializeGameState(metadata?: any): SaveData {
        const currentScene = this.engine.sceneManager.getCurrentScene();

        return {
            timestamp: Date.now(),
            currentSceneId: currentScene?.id || '',
            context: {
                flags: Array.from(this.engine.context.flags),
                variables: Array.from(this.engine.context.variables.entries()),
                player: this.engine.context.player,
            },
            metadata: metadata || {}
        };
    }

    /**
     * Restore game state from save data
     */
    private restoreGameState(saveData: SaveData): void {
        // Restore flags
        this.engine.context.flags = new Set(saveData.context.flags);

        // Restore variables
        this.engine.context.variables = new Map(saveData.context.variables);

        // Restore player (game is responsible for proper deserialization)
        this.engine.context.player = saveData.context.player;

        // Restore any custom context properties
        for (const [key, value] of Object.entries(saveData.context)) {
            if (key !== 'flags' && key !== 'variables' && key !== 'player') {
                this.engine.context[key] = value;
            }
        }

        // Transition to saved scene
        if (saveData.currentSceneId) {
            this.engine.sceneManager.goToScene(saveData.currentSceneId, this.engine.context);
        }
    }
}