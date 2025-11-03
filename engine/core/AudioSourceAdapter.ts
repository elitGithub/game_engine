/**
 * AudioSourceAdapter - Interface for loading audio from different sources
 */
export interface AudioSourceAdapter {
    /**
     * Load an audio file and decode it to AudioBuffer
     */
    load(audioId: string): Promise<AudioBuffer>;

    /**
     * Get the URL for an audio asset (for debugging/logging)
     */
    getUrl(audioId: string): string;
}

export interface AudioAssetMap {
    [audioId: string]: string; // audioId -> file path or URL
}