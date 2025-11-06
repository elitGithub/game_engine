// engine/rendering/helpers/UIRenderer.ts
import type {BarData, MenuData, RenderCommand, TextDisplayData, TextStyleData} from '@engine/types/RenderingTypes';
import type { DialogueLine } from '../DialogueLine';
import type { SpeakerRegistry } from '../SpeakerRegistry';
import { TextRenderer } from './TextRenderer';
import {SceneChoice} from "@engine/types/EngineEventMap";

/**
 * "Smart Helper" for Screen-Space rendering.
 *
 * This class is a utility used by your GameState. It owns the
 * TextRenderer and provides methods to build all UI element commands
 * (Dialogue, Choices, HUD, Menus) at fixed screen coordinates.
 *
 * CRITICAL: This is a TRANSLATION LAYER. It converts game data
 * into primitive render commands. It does NOT know about game structure
 * or access GameContext. All data must be passed explicitly.
 */
export class UIRenderer {
    private textRenderer: TextRenderer;

    /**
     * Creates a new UIRenderer.
     * @param speakerRegistry A reference to the game's SpeakerRegistry,
     * which is required by the internal TextRenderer.
     */
    constructor(speakerRegistry: SpeakerRegistry) {
        // UIRenderer owns the TextRenderer, passing its dependency
        this.textRenderer = new TextRenderer(speakerRegistry);
    }

    /**
     * Generates commands for a dialogue line.
     * (Delegates to TextRenderer)
     *
     * @param line - The dialogue line data
     * @param layout - The layout style ('bubble' or 'narrative')
     * @returns Array of render commands
     */
    buildDialogueCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
        return this.textRenderer.buildDialogueCommands(line, layout);
    }

    /**
     * Generates commands for a list of choices.
     * (Delegates to TextRenderer)
     *
     * @param choices - Array of choice data
     * @returns Array of render commands
     */
    buildChoiceCommands(choices: SceneChoice[]): RenderCommand[] {
        return this.textRenderer.buildChoiceCommands(choices);
    }

    /**
     * Generates commands for a resource bar (health, mana, stamina, etc.).
     *
     * This is a pure translation function. The game passes bar data,
     * and this method returns the render commands.
     *
     * @param barData - The bar data (current, max, position, size, colors)
     * @returns Array of render commands for the bar
     */
    buildBarCommands(barData: BarData): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const { current, max, position, size, id = 'bar', colors = {}, zIndex = 10000 } = barData;

        const percentage = Math.max(0, Math.min(1, current / max));

        // Background
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

        // Foreground (current value)
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

        // Text overlay
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

    /**
     * Generates commands for a text display element.
     *
     * @param textData - The text display data
     * @returns Array of render commands
     */
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
     * Generates commands for a generic game menu (e.g., Pause, Main Menu).
     *
     * This is a pure translation function. The game passes menu data,
     * and this method returns the render commands.
     *
     * @param menuData - The menu data structure
     * @returns Array of render commands for the menu
     */
    buildMenuCommands(menuData: MenuData): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = 20000; // Menus on top of HUD
        const layout = menuData.layout;
        const style = menuData.style || {};
        const padding = layout.padding || 20;

        // 1. Menu Background
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

        // 2. Menu Title
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
            currentY += 40; // Space for title
        }

        // 3. Menu Items (Buttons)
        const itemStyle: TextStyleData = {
            font: '18px Arial',
            color: 'white',
            align: 'left',
            ...style.itemStyle
        };
        const itemHeight = 40; // Height of each button's hotspot

        menuData.items.forEach((item, index) => {
            const itemX = layout.x + padding;
            const itemY = currentY + (index * itemHeight);

            // Button Text
            commands.push({
                type: 'text',
                id: item.id ? `${item.id}_text` : `menu_item_${index}_text`,
                text: item.label,
                x: itemX,
                y: itemY + (itemHeight / 2) + 5,
                style: itemStyle,
                zIndex: zIndex + 1
            });

            // Button Hotspot
            commands.push({
                type: 'hotspot',
                id: item.id ? `${item.id}_hotspot` : `menu_item_${index}_hotspot`,
                action: item.action, // Action for the InputManager
                x: itemX,
                y: itemY,
                width: layout.width - (padding * 2),
                height: itemHeight,
                zIndex: zIndex + 2 // Hotspot on top of text
            });
        });

        return commands;
    }
}