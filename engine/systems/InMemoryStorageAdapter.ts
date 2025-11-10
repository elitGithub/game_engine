/**
 * InMemoryStorageAdapter - In-memory storage for headless/testing environments
 *
 * Provides a storage implementation that keeps data in memory without persistence.
 * Useful for unit tests, CI/CD pipelines, and headless game simulation.
 */

import type { StorageAdapter, SaveSlotMetadata } from '../core/StorageAdapter';

/**
 * InMemoryStorageAdapter - Non-persistent storage implementation
 *
 * Data is stored in a Map and lost when the process exits.
 * Ideal for testing and headless environments.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
    private storage = new Map<string, string>();

    constructor(private prefix: string = 'headless_') {}

    async save(slotId: string, data: string): Promise<boolean> {
        try {
            this.storage.set(this.prefix + slotId, data);
            return true;
        } catch {
            return false;
        }
    }

    async load(slotId: string): Promise<string | null> {
        return this.storage.get(this.prefix + slotId) || null;
    }

    async delete(slotId: string): Promise<boolean> {
        try {
            this.storage.delete(this.prefix + slotId);
            return true;
        } catch {
            return false;
        }
    }

    async list(): Promise<SaveSlotMetadata[]> {
        const saves: SaveSlotMetadata[] = [];

        for (const [key, data] of this.storage.entries()) {
            if (key.startsWith(this.prefix)) {
                const slotId = key.substring(this.prefix.length);
                try {
                    const parsed = JSON.parse(data);
                    saves.push({
                        slotId,
                        timestamp: parsed.timestamp || 0,
                        ...parsed.metadata
                    });
                } catch {
                    // If not JSON, create basic metadata
                    saves.push({
                        slotId,
                        timestamp: Date.now()
                    });
                }
            }
        }

        return saves.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Clear all storage (for testing)
     */
    clear(): void {
        this.storage.clear();
    }

    /**
     * Get storage size (for testing)
     */
    size(): number {
        return this.storage.size;
    }
}
