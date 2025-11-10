// engine/rendering/helpers/TextRenderer.ts

import type { RenderCommand } from '@engine/types/RenderingTypes';
import { DialogueLayoutHelper } from './DialogueLayoutHelper';
import { ChoiceLayoutHelper } from './ChoiceLayoutHelper';
import type { PositionedChoice, PositionedDialogue } from '@engine/types/RenderingTypes';

/**
 * TextRenderer - "Smart Helper" / "Central Entry Point"
 *
 * This class is the single entry point for text-related rendering logic.
 * It owns and delegates work to specialized helpers.
 */
export class TextRenderer {

    private dialogueHelper: DialogueLayoutHelper;
    private choiceHelper: ChoiceLayoutHelper;

    constructor() {
        this.dialogueHelper = new DialogueLayoutHelper();
        this.choiceHelper = new ChoiceLayoutHelper();
    }

    /**
     * Generates commands for a dialogue line by delegating
     * to the DialogueLayoutHelper.
     */
    public buildDialogueCommands(dialogue: PositionedDialogue): RenderCommand[] {
        return this.dialogueHelper.buildCommands(dialogue);
    }

    /**
     * Generates commands for a list of choices by delegating
     * to the ChoiceLayoutHelper.
     */
    public buildChoiceCommands(choices: PositionedChoice[]): RenderCommand[] {
        return this.choiceHelper.buildCommands(choices);
    }
}