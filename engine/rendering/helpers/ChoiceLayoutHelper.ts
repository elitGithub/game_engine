// engine/rendering/helpers/ChoiceLayoutHelper.ts


import type { RenderCommand } from '../../types/RenderingTypes';
import {SceneChoice} from "@engine/types/EngineEventMap";

/**
 * ChoiceLayoutHelper - "Command Factory"
 *
 * Generates RenderCommand arrays for laying out choices.
 */
export class ChoiceLayoutHelper {
    constructor() {}

    /**
     * Generates commands for a list of choices.
     */
    buildCommands(choices: SceneChoice[]): RenderCommand[] {
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
                x: choiceX,
                y: yPos,
                style: { color: '#34d399', font: '18px Arial' },
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
}