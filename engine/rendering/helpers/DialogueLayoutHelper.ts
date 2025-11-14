// engine/rendering/helpers/DialogueLayoutHelper.ts

import type {PositionedDialogue, RenderCommand, } from '../../types/RenderingTypes';
import { DEFAULT_Z_INDEX } from '@engine/constants/RenderingConstants';


/**
 * DialogueLayoutHelper - Platform-agnostic dialogue rendering command factory.
 *
 * Pure command factory that accepts pre-positioned dialogue data and generates
 * platform-agnostic render commands. Does not manipulate DOM or perform any
 * platform-specific rendering operations.
 *
 * Generates commands for dialogue UI elements including background, speaker name,
 * dialogue text, and optional character portraits with proper z-index layering.
 *
 * @example
 * ```typescript
 * const helper = new DialogueLayoutHelper();
 * const positionedDialogue: PositionedDialogue = {
 *   id: 'dialogue_01',
 *   background: { x: 50, y: 400, width: 700, height: 150, fill: '#000000cc' },
 *   speaker: { x: 60, y: 415, text: 'Hero', style: { fontSize: '20px', fontFamily: 'Arial', color: '#ffffff' } },
 *   text: { x: 60, y: 450, text: 'Hello, world!', style: { fontSize: '16px', fontFamily: 'Arial', color: '#ffffff' } },
 *   zIndex: 1000
 * };
 * const commands = helper.buildCommands(positionedDialogue);
 * renderer.execute(commands);
 * ```
 */
export class DialogueLayoutHelper {

    /**
     * Generates all render commands needed to display a dialogue line.
     *
     * Creates commands for background rectangle, speaker name text, dialogue text,
     * and optional character portrait. All geometry and styling is provided via
     * the pre-positioned dialogue data object.
     *
     * @param dialogue - Pre-positioned dialogue data containing all geometry and styling information
     * @returns Array of render commands for background, speaker, text, and optional portrait
     */
    buildCommands(dialogue: PositionedDialogue): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = dialogue.zIndex || DEFAULT_Z_INDEX.UI_DIALOGUE;

        // 1. Background Rect
        if (dialogue.background) {
            commands.push({
                type: 'rect',
                id: `${dialogue.id}_bg`,
                x: dialogue.background.x,
                y: dialogue.background.y,
                width: dialogue.background.width,
                height: dialogue.background.height,
                fill: dialogue.background.fill,
                zIndex: zIndex
            });
        }

        // 2. Speaker Name
        if (dialogue.speaker) {
            commands.push({
                type: 'text',
                id: `${dialogue.id}_speaker`,
                text: dialogue.speaker.text,
                x: dialogue.speaker.x,
                y: dialogue.speaker.y,
                style: dialogue.speaker.style,
                zIndex: zIndex + 1
            });
        }

        // 3. Dialogue Text
        commands.push({
            type: 'text',
            id: `${dialogue.id}_text`,
            text: dialogue.text.text,
            x: dialogue.text.x,
            y: dialogue.text.y,
            style: dialogue.text.style,
            zIndex: zIndex + 1
        });

        // 4. Portrait
        if (dialogue.portrait) {
            commands.push({
                type: 'sprite', // or 'image'
                id: `${dialogue.id}_portrait`,
                assetId: dialogue.portrait.assetId,
                x: dialogue.portrait.x,
                y: dialogue.portrait.y,
                width: dialogue.portrait.width,
                height: dialogue.portrait.height,
                zIndex: zIndex + 1
            });
        }

        return commands;
    }
}