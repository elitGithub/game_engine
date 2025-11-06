// engine/rendering/helpers/UIRenderer.ts

import type { BarData, MenuData, RenderCommand, TextDisplayData, TextStyleData } from '@engine/types/RenderingTypes';
import type { DialogueLine } from '../DialogueLine';
import type { SpeakerRegistry } from '../SpeakerRegistry';
import { TextRenderer } from './TextRenderer';
import type { SceneChoice } from '@engine/types/EngineEventMap';

/**
 * UIRenderer - Screen-space rendering helper
 *
 * DECOUPLED: Pure translation layer. Converts game data into render commands.
 * Does NOT know about game structure or access GameContext.
 */
export class UIRenderer {
    private textRenderer: TextRenderer;

    constructor(speakerRegistry: SpeakerRegistry) {
        this.textRenderer = new TextRenderer(speakerRegistry);
    }

    buildDialogueCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
        return this.textRenderer.buildDialogueCommands(line, layout);
    }

    buildChoiceCommands(choices: SceneChoice[]): RenderCommand[] {
        return this.textRenderer.buildChoiceCommands(choices);
    }

    buildBarCommands(barData: BarData): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const { current, max, position, size, id = 'bar', colors = {}, zIndex = 10000 } = barData;

        const percentage = Math.max(0, Math.min(1, current / max));

        commands.push({
            type: 'rect',
            id: `${id}_bg`,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            fill: colors.background || '#440000',
            zIndex: zIndex
        });

        commands.push({
            type: 'rect',
            id: `${id}_fg`,
            x: position.x,
            y: position.y,
            width: size.width * percentage,
            height: size.height,
            fill: colors.foreground || '#00cc00',
            zIndex: zIndex + 1
        });

        const displayText = barData.label || `${current} / ${max}`;
        commands.push({
            type: 'text',
            id: `${id}_text`,
            text: displayText,
            x: position.x + 5,
            y: position.y + (size.height / 2) + 5,
            style: {
                color: colors.text || 'white',
                font: '12px Arial'
            },
            zIndex: zIndex + 2
        });

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
     * Uses generic data instead of action strings
     */
    buildMenuCommands(menuData: MenuData): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = 20000;
        const layout = menuData.layout;
        const style = menuData.style || {};
        const padding = layout.padding || 20;

        // Menu background
        commands.push({
            type: 'rect',
            id: menuData.id || 'menu_background',
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
            fill: style.backgroundColor || 'rgba(0, 0, 0, 0.8)',
            zIndex: zIndex
        });

        let currentY = layout.y + padding;

        // Menu title
        if (menuData.title) {
            commands.push({
                type: 'text',
                id: `${menuData.id || 'menu'}_title`,
                text: menuData.title,
                x: layout.x + (layout.width / 2),
                y: currentY + 10,
                style: {
                    font: '24px Arial',
                    color: 'white',
                    align: 'center',
                    ...style.titleStyle
                },
                zIndex: zIndex + 1
            });
            currentY += 40;
        }

        // Menu items
        const itemStyle: TextStyleData = {
            font: '18px Arial',
            color: 'white',
            align: 'left',
            ...style.itemStyle
        };
        const itemHeight = 40;

        menuData.items.forEach((item, index) => {
            const itemX = layout.x + padding;
            const itemY = currentY + (index * itemHeight);

            // Button text
            commands.push({
                type: 'text',
                id: item.id ? `${item.id}_text` : `menu_item_${index}_text`,
                text: item.label,
                x: itemX,
                y: itemY + (itemHeight / 2) + 5,
                style: itemStyle,
                zIndex: zIndex + 1
            });

            // Hotspot with generic data - no game logic
            commands.push({
                type: 'hotspot',
                id: item.id ? `${item.id}_hotspot` : `menu_item_${index}_hotspot`,
                data: item.data || { clickableId: item.id || `menu_item_${index}` },
                x: itemX,
                y: itemY,
                width: layout.width - (padding * 2),
                height: itemHeight,
                zIndex: zIndex + 2
            });
        });

        return commands;
    }
}