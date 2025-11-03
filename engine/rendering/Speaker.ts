/**
 * Speaker - Represents a character or narrator in dialogue
 */
import type { SpeakerConfig } from '@types/index';
import { TextStyle } from './TextStyle';

export class Speaker {
    public id: string;
    public name: string;
    public displayName: string;
    public color: string;
    public portrait: string | null;
    public portraitPosition: 'left' | 'right';
    public textStyle: TextStyle | null;
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
        this.textStyle = config.textStyle ? new TextStyle(config.textStyle) : null;
        this.voiceId = config.voiceId || null;
        this.voicePitch = config.voicePitch || 1.0;
        this.voiceSpeed = config.voiceSpeed || 1.0;
    }

    /**
     * Create a styled name element
     */
    createNameElement(): HTMLElement {
        const nameEl = document.createElement('div');
        nameEl.className = 'speaker-name';
        nameEl.textContent = this.displayName;
        nameEl.style.color = this.color;
        nameEl.style.fontWeight = 'bold';
        nameEl.style.marginBottom = '0.25rem';
        return nameEl;
    }

    /**
     * Create a portrait element
     */
    createPortraitElement(): HTMLElement | null {
        if (!this.portrait) return null;

        const portraitEl = document.createElement('img');
        portraitEl.className = 'speaker-portrait';
        portraitEl.src = this.portrait;
        portraitEl.alt = `${this.name} portrait`;
        portraitEl.style.width = '64px';
        portraitEl.style.height = '64px';
        portraitEl.style.borderRadius = '50%';
        portraitEl.style.objectFit = 'cover';
        portraitEl.style.border = `2px solid ${this.color}`;

        return portraitEl;
    }
}