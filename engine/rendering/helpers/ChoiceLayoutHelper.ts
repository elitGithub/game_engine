// engine/rendering/helpers/ChoiceLayoutHelper.ts

import type { RenderCommand } from '../../types/RenderingTypes';
import type { SceneChoice } from '@engine/types/EngineEventMap';

/**
 * ChoiceLayoutHelper - Pure command factory
 *
 * Generates RenderCommand arrays for laying out choices.
 * DECOUPLED: Uses generic data instead of game-specific action strings.
 */
export class ChoiceLayoutHelper {
    constructor() {}

    buildCommands(choices: SceneChoice[]): RenderCommand[] {
        const commands: RenderCommand[] = [];
        let startY = 300;
        const choiceSpacing = 50;
        const choiceX = 150;

        choices.forEach((choice, index) => {
            const choiceId = `choice_${index}`;
            const yPos = startY + (index * choiceSpacing);

            // Text for the choice
            commands.push({
                type: 'text',
                id: `${choiceId}_text`,
                text: choice.text || '',
                x: choiceX,
                y: yPos,
                style: { color: '#34d399', font: '18px Arial' },
                zIndex: 101
            });

            // Hotspot with generic data - no game logic here
            commands.push({
                type: 'hotspot',
                id: `${choiceId}_hotspot`,
                data: {
                    clickableId: `choice_${index}`,
                    choiceIndex: index
                },
                x: choiceX - 10,
                y: yPos - 20,
                width: 300,
                height: 40,
                zIndex: 102
            });
        });

        return commands;
    }
}