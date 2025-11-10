// engine/rendering/helpers/DialogueLayoutHelper.ts

import type {PositionedDialogue, RenderCommand, TextStyleData} from '../../types/RenderingTypes';
import type {TextStyleConfig} from '@engine/types';


/**
 * DialogueLayoutHelper - "Command Factory"
 *
 * Generates RenderCommand arrays for dialogue.
 * DECOUPLED: Accepts pre-positioned data.
 */
export class DialogueLayoutHelper {

    /**
     * Generates all commands needed to render a dialogue line
     * based on the pre-calculated geometry in the PositionedDialogue object.
     */
    buildCommands(dialogue: PositionedDialogue): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = dialogue.zIndex || 1000;

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

    // --- (textStyleToData helper method remains unchanged) ---
    private textStyleToData(style: TextStyleConfig | null, overrides: TextStyleData = {}): TextStyleData {
        const base: TextStyleData = {
            font: '16px Arial',
            color: '#ffffff',
            align: 'left',
            bold: false,
            italic: false
        };

        if (style) {
            // This code works perfectly because TextStyleConfig has all these properties
            const fontStyle = style.fontStyle || 'normal';
            const fontWeight = style.fontWeight || 'normal';
            const fontSize = style.fontSize || '16px';
            const fontFamily = style.fontFamily || 'Arial';

            base.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
            base.color = style.color || base.color;
            base.align = style.textAlign || base.align;
        }

        return {...base, ...overrides};
    }
}