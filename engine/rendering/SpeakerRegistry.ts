/**
 * SpeakerRegistry - Manages all speakers in the game
 */
import type { SpeakerConfig } from '@engine/types';
import { Speaker } from './Speaker';

export class SpeakerRegistry {
    private readonly speakers: Map<string, Speaker>;

    constructor() {
        this.speakers = new Map();
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
    get(speakerId: string): Speaker | undefined {
        return this.speakers.get(speakerId);
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