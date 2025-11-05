// engine/rendering/helpers/TextRenderer.ts
import type { SceneChoice } from '@engine/types';
import type { RenderCommand } from '@engine/types/RenderingTypes';
import type { DialogueLine } from '../DialogueLine';
import type { SpeakerRegistry } from '../SpeakerRegistry';
import { DialogueLayoutHelper } from './DialogueLayoutHelper';
import { ChoiceLayoutHelper } from './ChoiceLayoutHelper';

/**
 * TextRenderer - "Smart Helper" / "Central Entry Point"
 *
 * This class is the single entry point for text-related rendering logic.
 * It owns and delegates work to specialized helpers.
 */
export class TextRenderer {

    private dialogueHelper: DialogueLayoutHelper;
    private choiceHelper: ChoiceLayoutHelper;

    constructor(speakerRegistry: SpeakerRegistry) {
        // --- FIX: Instantiate the specialized helpers ---
        this.dialogueHelper = new DialogueLayoutHelper(speakerRegistry);
        this.choiceHelper = new ChoiceLayoutHelper();
    }

    /**
     * Generates commands for a dialogue line by delegating
     * to the DialogueLayoutHelper.
     */
    public buildDialogueCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
        return this.dialogueHelper.buildCommands(line, layout);
    }

    /**
     * Generates commands for a list of choices by delegating
     * to the ChoiceLayoutHelper.
     */
    public buildChoiceCommands(choices: SceneChoice[]): RenderCommand[] {
        return this.choiceHelper.buildCommands(choices);
    }
}