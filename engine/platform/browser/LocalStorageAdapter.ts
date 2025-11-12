/**
 * LocalStorageAdapter - Browser localStorage implementation
 *
 * Platform-specific storage adapter for browsers using localStorage API.
 */
import type { StorageAdapter, SaveSlotMetadata } from '@engine/core/StorageAdapter';
import {ILogger} from "@engine/interfaces";

export class LocalStorageAdapter implements StorageAdapter {

    constructor(private keyPrefix: string = 'game_save_', private logger: ILogger) {

    }

    async save(slotId: string, data: string): Promise<boolean> {
        try {
            const key = this.getKey(slotId);
            localStorage.setItem(key, data);
            return true;
        } catch (error) {
            this.logger.error('[LocalStorage] Save failed:', error);
            return false;
        }
    }

    async load(slotId: string): Promise<string | null> {
        try {
            const key = this.getKey(slotId);
            return localStorage.getItem(key);
        } catch (error) {
            this.logger.error('[LocalStorage] Load failed:', error);
            return null;
        }
    }

    async delete(slotId: string): Promise<boolean> {
        try {
            const key = this.getKey(slotId);
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            this.logger.error('[LocalStorage] Delete failed:', error);
            return false;
        }
    }

    async list(): Promise<SaveSlotMetadata[]> {
        try {
            const saves: SaveSlotMetadata[] = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    const slotId = key.substring(this.keyPrefix.length);
                    const data = localStorage.getItem(key);

                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            saves.push({
                                slotId,
                                timestamp: parsed.timestamp || 0,
                                ...parsed.metadata
                            });
                        } catch {
                            // Skip invalid JSON
                        }
                    }
                }
            }

            return saves.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            this.logger.error('[LocalStorage] List failed:', error);
            return [];
        }
    }

    private getKey(slotId: string): string {
        return `${this.keyPrefix}${slotId}`;
    }
}