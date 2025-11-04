/**
 * SaveManager - Handles game save/load with configurable storage backend
 */
import type {Engine} from '../Engine';
import type {StorageAdapter, SaveSlotMetadata} from '../core/StorageAdapter';
import {LocalStorageAdapter} from './LocalStorageAdapter';

export interface SaveData {
    version: string; // ← ADD VERSION
    timestamp: number;
    currentSceneId: string;
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

    async saveGame(slotId: string, metadata?: any): Promise<boolean> {
        try {
            const saveData = this.serializeGameState(metadata);
            const json = JSON.stringify(saveData);
            const success = await this.adapter.save(slotId, json);

            if (success) {
                this.engine.eventBus.emit('save.completed', {
                    slotId,
                    timestamp: saveData.timestamp
                });
            }

            return success;
        } catch (error) {
            console.error('[SaveManager] Save failed:', error);
            this.engine.eventBus.emit('save.failed', {slotId, error});
            return false;
        }
    }

    async loadGame(slotId: string): Promise<boolean> {
        try {
            const json = await this.adapter.load(slotId);
            if (!json) return false;

            let saveData: SaveData = JSON.parse(json);

            // ← MIGRATION LOGIC
            saveData = this.migrateIfNeeded(saveData);

            this.restoreGameState(saveData);

            this.engine.eventBus.emit('save.loaded', {
                slotId,
                timestamp: saveData.timestamp
            });
            return true;
        } catch (error) {
            console.error('[SaveManager] Load failed:', error);
            this.engine.eventBus.emit('save.loadFailed', {slotId, error});
            return false;
        }
    }

    /**
     * ← NEW: Migrate save data through registered migration functions
     */
    private migrateIfNeeded(saveData: SaveData): SaveData {
        // If no version, assume oldest (pre-versioning)
        const saveVersion = saveData.version || '1.0.0';
        const currentVersion = this.engine.config.gameVersion;

        if (saveVersion === currentVersion) {
            return saveData; // No migration needed
        }

        console.log(`[SaveManager] Migrating save from ${saveVersion} to ${currentVersion}`);

        // Apply migrations in order
        let migratedData = saveData;
        const versions = this.getVersionPath(saveVersion, currentVersion);

        for (let i = 0; i < versions.length - 1; i++) {
            const from = versions[i];
            const to = versions[i + 1];
            const key = `${from}_to_${to}`;

            const migration = this.engine.migrationFunctions.get(key);
            if (migration) {
                console.log(`[SaveManager] Applying migration ${key}`);
                migratedData = migration(migratedData);
                migratedData.version = to;
            } else {
                console.warn(`[SaveManager] No migration found for ${key}`);
            }
        }

        return migratedData;
    }

    /**
     * ← NEW: Get version path (e.g., ['1.0.0', '1.1.0', '1.2.0'])
     * Simple implementation - you may need semver library for complex cases
     */
    private getVersionPath(from: string, to: string): string[] {
        // For now, check all registered migrations to build path
        const allVersions = new Set<string>([from, to]);

        this.engine.migrationFunctions.forEach((_, key) => {
            const [fromV, toV] = key.split('_to_');
            allVersions.add(fromV);
            allVersions.add(toV);
        });

        // Sort versions (basic string sort - use semver for production)
        const sorted = Array.from(allVersions).sort();
        const fromIndex = sorted.indexOf(from);
        const toIndex = sorted.indexOf(to);

        return sorted.slice(fromIndex, toIndex + 1);
    }

    async deleteSave(slotId: string): Promise<boolean> {
        const success = await this.adapter.delete(slotId);
        if (success) {
            this.engine.eventBus.emit('save.deleted', {slotId});
        }
        return success;
    }

    async listSaves(): Promise<SaveSlotMetadata[]> {
        return await this.adapter.list();
    }

    private serializeGameState(metadata?: any): SaveData {
        const currentScene = this.engine.sceneManager.getCurrentScene();
        const systemsData: { [key: string]: any } = {};

        for (const [key, system] of this.engine.serializableSystems.entries()) {
            try {
                systemsData[key] = system.serialize();
            } catch (error) {
                console.error(`[SaveManager] Failed to serialize system '${key}':`, error);
            }
        }

        return {
            version: this.engine.config.gameVersion, // ← SAVE VERSION
            timestamp: Date.now(),
            currentSceneId: currentScene?.id || '',
            systems: systemsData,
            metadata: metadata || {}
        };
    }

    private restoreGameState(saveData: SaveData): void {
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

        if (saveData.currentSceneId) {
            this.engine.sceneManager.goToScene(saveData.currentSceneId, this.engine.context);
        }
    }
}