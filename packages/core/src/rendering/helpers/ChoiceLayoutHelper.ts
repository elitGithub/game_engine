// engine/rendering/helpers/ChoiceLayoutHelper.ts

import type { RenderCommand, PositionedChoice } from '../../types/RenderingTypes';
import { DEFAULT_Z_INDEX } from '@game-engine/core/constants/RenderingConstants';

/**
 * ChoiceLayoutHelper - Platform-agnostic choice menu rendering command factory.
 *
 * Pure command factory that accepts pre-positioned choice data and generates
 * platform-agnostic render commands. Does not manipulate DOM or perform any
 * platform-specific rendering operations.
 *
 * Generates commands for choice menu items including text labels and interactive
 * hotspots with generic data for event handling.
 *
 * @example
 * ```typescript
 * const helper = new ChoiceLayoutHelper();
 * const positionedChoices: PositionedChoice[] = [
 *   {
 *     id: 'choice_1',
 *     text: 'Accept quest',
 *     textPos: { x: 100, y: 300 },
 *     hotspot: { x: 90, y: 285, width: 200, height: 30 },
 *     data: { action: 'select', choiceIndex: 0 },
 *     style: { color: '#34d399', fontSize: '18px', fontFamily: 'Arial' }
 *   }
 * ];
 * const commands = helper.buildCommands(positionedChoices);
 * renderer.execute(commands);
 * ```
 */
export class ChoiceLayoutHelper {
    /**
     * Generates all render commands needed to display a list of player choices.
     *
     * Creates commands for each choice item including text label and interactive
     * hotspot area. All geometry and styling is provided via pre-positioned choice
     * data objects. Hotspots contain generic data for platform-specific event handling.
     *
     * @param choices - Array of pre-positioned choice data containing geometry and interaction information
     * @returns Array of render commands for all choice text labels and hotspots
     */
    buildCommands(choices: PositionedChoice[]): RenderCommand[] {
        const commands: RenderCommand[] = [];

        choices.forEach(choice => {
            // Text for the choice (uses pre-calculated positions)
            commands.push({
                type: 'text',
                id: `${choice.id}_text`,
                text: choice.text,
                x: choice.textPos.x, // <-- Use provided data
                y: choice.textPos.y, // <-- Use provided data
                style: choice.style,
                zIndex: DEFAULT_Z_INDEX.UI_DIALOGUE + 1
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
                zIndex: DEFAULT_Z_INDEX.UI_DIALOGUE + 2
            });
        });

        return commands;
    }
}