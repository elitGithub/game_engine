// engine/rendering/helpers/ChoiceLayoutHelper.ts

import type { RenderCommand, TextStyleData } from '../../types/RenderingTypes';
// --- FIX: Import the new PositionedChoice type ---
import type { PositionedChoice } from '../../types/RenderingTypes';

/**
 * ChoiceLayoutHelper - Pure command factory
 *
 * Generates RenderCommand arrays for laying out choices.
 * DECOUPLED: Accepts pre-positioned data.
 */
export class ChoiceLayoutHelper {
    constructor() {}

    // --- FIX: Method signature changed to accept PositionedChoice[] ---
    buildCommands(choices: PositionedChoice[]): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const defaultStyle: TextStyleData = { color: '#34d399', font: '18px Arial' };

        choices.forEach(choice => {
            // Text for the choice (uses pre-calculated positions)
            commands.push({
                type: 'text',
                id: `${choice.id}_text`,
                text: choice.text,
                x: choice.textPos.x, // <-- Use provided data
                y: choice.textPos.y, // <-- Use provided data
                style: { ...defaultStyle, ...(choice.style || {}) },
                zIndex: 101
            });

            // Hotspot with generic data - no game logic here
            commands.push({
                type: 'hotspot',
                id: `${choice.id}_hotspot`,
                data: choice.data,
                x: choice.hotspot.x, // <-- Use provided data
                y: choice.hotspot.y, // <-- Use provided data
                width: choice.hotspot.width, // <-- Use provided data
                height: choice.hotspot.height, // <-- Use provided data
                zIndex: 102
            });
        });

        return commands;
    }
}