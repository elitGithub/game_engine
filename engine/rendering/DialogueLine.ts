/**
 * DialogueLine - Represents a single line of dialogue
 */
import type { DialogueLineOptions } from '@engine/types';

export class DialogueLine {
    public readonly speakerId: string;
    public readonly text: string;
    public readonly options: Readonly<DialogueLineOptions>;

    constructor(speakerId: string, text: string, options: DialogueLineOptions = {}) {
        this.speakerId = speakerId;
        this.text = text;
        this.options = {
            ...options,
            showPortrait: options.showPortrait !== false,
            showName: options.showName !== false,
        };
    }
}