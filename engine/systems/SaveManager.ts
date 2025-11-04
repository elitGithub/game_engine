// engine/systems/SaveManager.ts
import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';
import type { EventBus } from '../core/EventBus';
import { LocalStorageAdapter } from './LocalStorageAdapter';
import type { ISerializable, MigrationFunction } from '../types';
import semver from 'semver';

export interface SaveData {
    version: string;
    timestamp: number;
    currentSceneId: string;
    systems: {
        [key: string]: any;
    };
    metadata?: {
        [key: string]: any;
    };
}

export interface ISerializationRegistry {
    serializableSystems: Map<string, ISerializable>;
    migrationFunctions: Map<string, MigrationFunction>;
    readonly gameVersion: string;
    getCurrentSceneId(): string;
    restoreScene(sceneId: string): void;
}

export class SaveManager {
    private eventBus: EventBus;
    private registry: ISerializationRegistry;
    private adapter: StorageAdapter;

    constructor(
        eventBus: EventBus,
        registry: ISerializationRegistry,
        adapter?: StorageAdapter
    ) {
        this.eventBus = eventBus;
        this.registry = registry;
        this.adapter = adapter || new LocalStorageAdapter();
    }

    async saveGame(slotId: string, metadata?: any): Promise<boolean> {
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
            saveData = this.migrateIfNeeded(saveData);
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

    private migrateIfNeeded(saveData: SaveData): SaveData {
        const saveVersion = saveData.version || '1.0.0';
        const currentVersion = this.registry.gameVersion;

        if (saveVersion === currentVersion) {
            return saveData;
        }

        console.log(`[SaveManager] Migrating save from ${saveVersion} to ${currentVersion}`);

        let migratedData = saveData;
        const versions = this.getVersionPath(saveVersion, currentVersion);

        for (let i = 0; i < versions.length - 1; i++) {
            const from = versions[i];
            const to = versions[i + 1];
            const key = `${from}_to_${to}`;

            const migration = this.registry.migrationFunctions.get(key);
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

    private getVersionPath(from: string, to: string): string[] {
        const allVersions = new Set<string>([from, to]);

        this.registry.migrationFunctions.forEach((_, key) => {
            const [fromV, toV] = key.split('_to_');
            allVersions.add(fromV);
            allVersions.add(toV);
        });

        const sorted = Array.from(allVersions)
            .filter(v => semver.valid(v))
            .sort(semver.compare);

        const fromIndex = sorted.indexOf(from);
        const toIndex = sorted.indexOf(to);

        if (fromIndex === -1 || toIndex === -1) {
            console.warn(`[SaveManager] Invalid version in migration path: from=${from}, to=${to}`);
            return [from, to];
        }

        return sorted.slice(fromIndex, toIndex + 1);
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

    private serializeGameState(metadata?: any): SaveData {
        const systemsData: { [key: string]: any } = {};

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