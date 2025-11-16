/**
 * SaveSlotMetadata - Metadata for a save slot
 */
export interface SaveSlotMetadata {
    slotId: string;
    timestamp: number;
    [key: string]: unknown; // Allow custom metadata
}
