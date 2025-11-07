/**
 * DialogueLine - Represents a single line of dialogue
 */
import type { DialogueLineOptions } from '@engine/types';

export class DialogueLine {
    public speakerId: string;
    public text: string;
    public options: DialogueLineOptions;

    constructor(speakerId: string, text: string, options: DialogueLineOptions = {}) {
        this.speakerId = speakerId;
        this.text = text;
        this.options = {
            showPortrait: options.showPortrait !== false,
            showName: options.showName !== false,
            style: options.style,
            ...options
        };
    }
}