// engine/rendering/helpers/UIRenderer.ts

import type {
    RenderCommand,
    TextDisplayData,
    PositionedBar,
    PositionedMenu,
    PositionedChoice,
    PositionedDialogue
} from '@engine/types/RenderingTypes';
import { TextRenderer } from './TextRenderer';

/**
 * UIRenderer - Screen-space rendering helper
 *
 * DECOUPLED: Pure translation layer. Converts pre-positioned game data into render commands.
 */
export class UIRenderer {
    private textRenderer: TextRenderer;

    constructor() {
        this.textRenderer = new TextRenderer();
    }

    buildDialogueCommands(dialogue: PositionedDialogue): RenderCommand[] {
        return this.textRenderer.buildDialogueCommands(dialogue);
    }

    buildChoiceCommands(choices: PositionedChoice[]): RenderCommand[] {
        return this.textRenderer.buildChoiceCommands(choices);
    }

    buildBarCommands(barData: PositionedBar): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = barData.zIndex || 10000;

        // 1. Background Rect
        commands.push({
            type: 'rect',
            id: `${barData.id}_bg`,
            x: barData.background.x,
            y: barData.background.y,
            width: barData.background.width,
            height: barData.background.height,
            fill: barData.background.fill,
            zIndex: zIndex
        });

        // 2. Foreground Rect
        commands.push({
            type: 'rect',
            id: `${barData.id}_fg`,
            x: barData.foreground.x,
            y: barData.foreground.y,
            width: barData.foreground.width,
            height: barData.foreground.height,
            fill: barData.foreground.fill,
            zIndex: zIndex + 1
        });

        // 3. Label (if provided)
        if (barData.label) {
            commands.push({
                type: 'text',
                id: `${barData.id}_text`,
                text: barData.label.text,
                x: barData.label.x,
                y: barData.label.y,
                style: barData.label.style,
                zIndex: zIndex + 2
            });
        }
        return commands;
    }

    buildTextDisplayCommands(textData: TextDisplayData): RenderCommand[] {
        const { text, position, id = 'text_display', style = {}, zIndex = 10000 } = textData;

        return [{
            type: 'text',
            id: id,
            text: text,
            x: position.x,
            y: position.y,
            style: {
                font: '14px Arial',
                color: 'white',
                ...style
            },
            zIndex: zIndex
        }];
    }

    /**
     * Build menu commands - DECOUPLED from game logic
     * Uses generic, pre-positioned data.
     */
    buildMenuCommands(menuData: PositionedMenu): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = menuData.zIndex || 20000;

        // Menu background
        commands.push({
            type: 'rect',
            id: `${menuData.id}_bg`,
            x: menuData.background.x,
            y: menuData.background.y,
            width: menuData.background.width,
            height: menuData.background.height,
            fill: menuData.background.fill,
            zIndex: zIndex
        });

        // Menu title
        if (menuData.title) {
            commands.push({
                type: 'text',
                id: `${menuData.id}_title`,
                text: menuData.title.text,
                x: menuData.title.x,
                y: menuData.title.y,
                style: menuData.title.style,
                zIndex: zIndex + 1
            });
        }

        // Menu items
        menuData.items.forEach(item => {
            // Button text
            commands.push({
                type: 'text',
                id: `${item.id}_text`,
                text: item.text.text,
                x: item.text.x,
                y: item.text.y,
                style: item.text.style,
                zIndex: zIndex + 1
            });

            // Hotspot with generic data
            commands.push({
                type: 'hotspot',
                id: item.id ? `${item.id}_hotspot` : `menu_item_${item.id}_hotspot`,
                data: item.data,
                x: item.hotspot.x,
                y: item.hotspot.y,
                width: item.hotspot.width,
                height: item.hotspot.height,
                zIndex: zIndex + 2
            });
        });

        return commands;
    }
}