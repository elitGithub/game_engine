// engine/rendering/helpers/TextRenderer.ts

import type { RenderCommand } from '@engine/types/RenderingTypes';
import { DialogueLayoutHelper } from './DialogueLayoutHelper';
import { ChoiceLayoutHelper } from './ChoiceLayoutHelper';
import type { PositionedChoice, PositionedDialogue } from '@engine/types/RenderingTypes';

/**
 * TextRenderer - Central coordinator for text-related rendering commands.
 *
 * Serves as the single entry point for all text-related rendering operations,
 * delegating work to specialized helper classes. Does not manipulate DOM or
 * perform any platform-specific rendering operations.
 *
 * Owns and coordinates DialogueLayoutHelper and ChoiceLayoutHelper to provide
 * a unified interface for text rendering command generation.
 *
 * @example
 * ```typescript
 * const textRenderer = new TextRenderer();
 *
 * // Generate dialogue commands
 * const dialogueCommands = textRenderer.buildDialogueCommands(positionedDialogue);
 *
 * // Generate choice commands
 * const choiceCommands = textRenderer.buildChoiceCommands(positionedChoices);
 *
 * renderer.execute([...dialogueCommands, ...choiceCommands]);
 * ```
 */
export class TextRenderer {

    private dialogueHelper: DialogueLayoutHelper;
    private choiceHelper: ChoiceLayoutHelper;

    constructor() {
        this.dialogueHelper = new DialogueLayoutHelper();
        this.choiceHelper = new ChoiceLayoutHelper();
    }

    /**
     * Generates render commands for a dialogue line.
     *
     * Delegates to DialogueLayoutHelper to create commands for dialogue background,
     * speaker name, dialogue text, and optional character portrait.
     *
     * @param dialogue - Pre-positioned dialogue data containing all geometry and styling information
     * @returns Array of render commands for all dialogue visual elements
     */
    public buildDialogueCommands(dialogue: PositionedDialogue): RenderCommand[] {
        return this.dialogueHelper.buildCommands(dialogue);
    }

    /**
     * Generates render commands for a list of player choices.
     *
     * Delegates to ChoiceLayoutHelper to create commands for choice text labels
     * and interactive hotspot areas.
     *
     * @param choices - Array of pre-positioned choice data containing geometry and interaction information
     * @returns Array of render commands for all choice visual elements and hotspots
     */
    public buildChoiceCommands(choices: PositionedChoice[]): RenderCommand[] {
        return this.choiceHelper.buildCommands(choices);
    }
}