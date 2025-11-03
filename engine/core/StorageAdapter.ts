/**
 * StorageAdapter - Interface for save data storage backends
 */
export interface StorageAdapter {
    /**
     * Save data to storage
     */
    save(slotId: string, data: string): Promise<boolean>;

    /**
     * Load data from storage
     */
    load(slotId: string): Promise<string | null>;

    /**
     * Delete a save slot
     */
    delete(slotId: string): Promise<boolean>;

    /**
     * List all available save slots with metadata
     */
    list(): Promise<SaveSlotMetadata[]>;
}

export interface SaveSlotMetadata {
    slotId: string;
    timestamp: number;
    [key: string]: any; // Allow custom metadata
}