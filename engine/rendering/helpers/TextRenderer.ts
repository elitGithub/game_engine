// engine/rendering/helpers/TextRenderer.ts
import type { SceneChoice, TextStyleConfig } from '@engine/types';
import type { RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';
import type { DialogueLine } from '../DialogueLine';
import type { SpeakerRegistry } from '../SpeakerRegistry';
import { TextStyle } from './TextStyle'; // Keep TextStyle for config/presets

/**
 * TextRenderer - "Smart Helper" / "Command Factory"
 *
 * Centralizes all logic for building RenderCommands for
 * dialogue, choices, and other text elements.
 * This is NOT a renderer. It *builds commands* for a dumb renderer.
 */
export class TextRenderer {

    constructor(private speakerRegistry: SpeakerRegistry) {}

    /**
     * Generates all commands needed to render a dialogue line.
     * This logic was moved from DialogueLayoutHelper.
     */
    buildDialogueCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
        const speaker = this.speakerRegistry.get(line.speakerId);
        const commands: RenderCommand[] = [];

        // Example layout: "bubble" at bottom-center
        if (layout === 'bubble') {
            const bubbleId = 'dialogue_bubble';
            const textId = 'dialogue_text';
            const speakerId = 'dialogue_speaker';
            const portraitId = 'dialogue_portrait';

            // 1. Background Rect
            commands.push({
                type: 'rect',
                id: bubbleId, x: 100, y: 450, width: 600, height: 140,
                fill: 'rgba(0, 0, 0, 0.7)',
                zIndex: 1000
            });

            // 2. Speaker Name (if shown)
            if (line.options.showName && speaker.id !== 'narrator') {
                commands.push({
                    type: 'text',
                    id: speakerId,
                    text: speaker.displayName,
                    x: 120, y: 470,
                    // Use helper to convert rich style to dumb style
                    style: this.textStyleToData(speaker.textStyle, { color: speaker.color, bold: true }),
                    zIndex: 1001
                });
            }

            // 3. Dialogue Text
            commands.push({
                type: 'text',
                id: textId,
                text: line.text,
                x: 120, y: 500,
                style: this.textStyleToData(null), // Use default
                zIndex: 1001
            });

            // 4. Portrait (if shown)
            if (line.options.showPortrait && speaker.portrait) {
                commands.push({
                    type: 'sprite',
                    id: portraitId,
                    assetId: speaker.portrait, // Assumes portrait is an assetId
                    x: 20, y: 460, width: 64, height: 64,
                    zIndex: 1001
                });
            }
        }
        // TODO: Implement 'narrative' layout
        return commands;
    }

    /**
     * Generates commands for a list of choices.
     * This logic was moved from ChoiceLayoutHelper.
     */
    buildChoiceCommands(choices: SceneChoice[]): RenderCommand[] {
        const commands: RenderCommand[] = [];
        let startY = 300; // Example starting position
        const choiceSpacing = 50;
        const choiceX = 150;

        choices.forEach((choice, index) => {
            const choiceId = `choice_${index}`;
            const yPos = startY + (index * choiceSpacing);

            // 1. Text for the choice
            commands.push({
                type: 'text',
                id: `${choiceId}_text`,
                text: choice.text,
                x: choiceX, y: yPos,
                style: { color: '#34d399', font: '18px Arial' }, // Example style
                zIndex: 101
            });

            // 2. Hotspot for the choice
            commands.push({
                type: 'hotspot',
                id: `${choiceId}_hotspot`,
                action: `choice:${index}`, // The action the InputManager will catch
                x: choiceX - 10, //- Slightly larger clickable area
                y: yPos - 20,
                width: 300, //- Example width
                height: 40,
                zIndex: 102
            });
        });

        return commands;
    }

    /**
     * Utility to convert a rich TextStyle/TextStyleConfig object
     * into the "dumb" TextStyleData for a RenderCommand.
     */
    private textStyleToData(style: TextStyle | TextStyleConfig | null, overrides: TextStyleData = {}): TextStyleData {
        const base: TextStyleData = {
            font: '16px Arial',
            color: '#ffffff',
            align: 'left',
            bold: false,
            italic: false
        };

        if (style) {
            const fontStyle = style.fontStyle || 'normal';
            const fontWeight = style.fontWeight || 'normal';
            const fontSize = style.fontSize || '16px';
            const fontFamily = style.fontFamily || 'Arial';

            base.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
            base.color = style.color || base.color;
            base.align = style.textAlign || base.align;
        }

        return { ...base, ...overrides };
    }
}