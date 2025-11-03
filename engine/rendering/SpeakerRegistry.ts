/**
 * SpeakerRegistry - Manages all speakers in the game
 */
import type { SpeakerConfig } from '@types/index';
import { Speaker } from './Speaker';

export class SpeakerRegistry {
    private speakers: Map<string, Speaker>;

    constructor() {
        this.speakers = new Map();

        // Register default narrator
        this.register(new Speaker({
            id: 'narrator',
            name: 'Narrator',
            color: '#e5e7eb'
        }));
    }

    /**
     * Register a speaker
     */
    register(speaker: Speaker): void {
        this.speakers.set(speaker.id, speaker);
    }

    /**
     * Get a speaker by ID
     */
    get(speakerId: string): Speaker {
        return this.speakers.get(speakerId) || this.speakers.get('narrator')!;
    }

    /**
     * Create multiple speakers at once
     */
    registerMultiple(speakerConfigs: SpeakerConfig[]): void {
        speakerConfigs.forEach(config => {
            this.register(new Speaker(config));
        });
    }

    /**
     * Check if a speaker exists
     */
    has(speakerId: string): boolean {
        return this.speakers.has(speakerId);
    }

    /**
     * Get all registered speakers
     */
    getAll(): Speaker[] {
        return Array.from(this.speakers.values());
    }
}