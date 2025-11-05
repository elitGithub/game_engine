/**
 * Speaker - Represents a character or narrator in dialogue
 */
import type { SpeakerConfig, TextStyleConfig } from '@engine/types';

export class Speaker {
    public id: string;
    public name: string;
    public displayName: string;
    public color: string;
    public portrait: string | null; // This is an Asset ID
    public portraitPosition: 'left' | 'right';
    public textStyle: TextStyleConfig | null; // Use config, not class
    public voiceId: string | null;
    public voicePitch: number;
    public voiceSpeed: number;

    constructor(config: SpeakerConfig) {
        this.id = config.id;
        this.name = config.name;
        this.displayName = config.displayName || config.name;
        this.color = config.color || '#ffffff';
        this.portrait = config.portrait || null;
        this.portraitPosition = config.portraitPosition || 'left';
        this.textStyle = config.textStyle || null; // Store the config
        this.voiceId = config.voiceId || null;
        this.voicePitch = config.voicePitch || 1.0;
        this.voiceSpeed = config.voiceSpeed || 1.0;
    }
}