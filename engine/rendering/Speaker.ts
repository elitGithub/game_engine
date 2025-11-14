/**
 * Speaker - Represents a character or narrator in dialogue
 */
import type { SpeakerConfig, TextStyleData } from '@engine/types';

export class Speaker {
    public readonly id: string;
    public readonly name: string;
    public readonly displayName: string;
    public readonly color: string;
    public readonly portrait: string | null; // This is an Asset ID
    public readonly portraitPosition: 'left' | 'right';
    public readonly textStyle: TextStyleData | null;
    public readonly voiceId: string | null;
    public readonly voicePitch: number;
    public readonly voiceSpeed: number;

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