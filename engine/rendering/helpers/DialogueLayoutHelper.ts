// engine/rendering/helpers/DialogueLayoutHelper.ts

import type { DialogueLine } from '../DialogueLine';
import type { RenderCommand, TextStyleData } from '../../types/RenderingTypes';
import type { SpeakerRegistry } from '../SpeakerRegistry';
// --- FIX: Add necessary imports ---
import type { TextStyleConfig } from '@engine/types';
import { TextStyle } from './TextStyle';

/**
 * DialogueLayoutHelper - "Command Factory"
 *
 * Generates RenderCommand arrays for complex dialogue layouts.
 * This is a "smart" helper, the renderers are "dumb".
 */
export class DialogueLayoutHelper {
    constructor(private speakerRegistry: SpeakerRegistry) {}

    /**
     * Generates all commands needed to render a dialogue line
     * in a specific layout (e..g., a "bubble" at the bottom).
     */
    buildCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
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
                id: bubbleId,
                x: 100, // Example values
                y: 450, // Example values
                width: 600,
                height: 140,
                fill: 'rgba(0, 0, 0, 0.7)',
                zIndex: 1000
            });

            // 2. Speaker Name (if shown)
            if (line.options.showName && speaker.id !== 'narrator') {
                commands.push({
                    type: 'text',
                    id: speakerId,
                    text: speaker.displayName,
                    x: 120, // Example values
                    y: 470, // Example values
                    // --- FIX: Use the moved utility method ---
                    style: this.textStyleToData(speaker.textStyle, { color: speaker.color, bold: true }),
                    zIndex: 1001
                });
            }

            // 3. Dialogue Text
            commands.push({
                type: 'text',
                id: textId,
                text: line.text,
                x: 120, // Example values
                y: 500, // Example values
                // --- FIX: Use the moved utility method ---
                style: this.textStyleToData(null), // Use default
                zIndex: 1001
            });

            // 4. Portrait (if shown)
            if (line.options.showPortrait && speaker.portrait) {
                commands.push({
                    type: 'sprite', // or 'image'
                    id: portraitId,
                    assetId: speaker.portrait, // Assumes portrait ID matches a preloaded asset ID
                    x: 20, // Example values
                    y: 460, // Example values
                    width: 64,
                    height: 64,
                    zIndex: 1001
                });
            }
        }

        // TODO: Implement 'narrative' layout

        return commands;
    }

    // --- FIX: Utility method moved here from TextRenderer monolith ---
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
            // This is type-safe because types/index.ts is already correct
            base.align = style.textAlign || base.align;
        }

        return { ...base, ...overrides };
    }
}