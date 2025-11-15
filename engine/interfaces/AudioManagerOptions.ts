/**
 * AudioManagerOptions - Configuration for AudioManager system
 */
export interface AudioManagerOptions {
    sfxPoolSize: number;
    maxSources: number;
    volumes?: {
        master?: number;
        music?: number;
        sfx?: number;
        voice?: number;
    };
}
