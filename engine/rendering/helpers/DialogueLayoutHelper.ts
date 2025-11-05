// engine/rendering/helpers/DialogueLayoutHelper.ts

import type { DialogueLine } from '../DialogueLine';
import type { RenderCommand } from '../../types/RenderingTypes';
import type { SpeakerRegistry } from '../SpeakerRegistry';

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
     * in a specific layout (e.g., a "bubble" at the bottom).
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
                    style: { color: speaker.color, bold: true, font: '18px Arial' },
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
                style: { color: '#ffffff', font: '16px Arial' },
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
}