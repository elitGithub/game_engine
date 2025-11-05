// engine/rendering/helpers/UIRenderer.ts
import type { RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';
import type { GameContext } from '@engine/types';
import type { DialogueLine } from '../DialogueLine';
import type { SpeakerRegistry } from '../SpeakerRegistry';
import { TextRenderer } from './TextRenderer';
import {SceneChoice} from "@engine/types/EngineEventMap";

/**
 * Defines the contract for a menu button.
 * Your GameState can create an array of these
 * to be rendered by the UIRenderer.
 */
export interface MenuItem {
    /** The text to display on the button */
    label: string;
    /** The action string for the 'hotspot' command */
    action: string;
    /** Optional: unique ID for the render command */
    id?: string;
}

/**
 * Defines the data structure for a generic menu.
 */
export interface MenuData {
    title?: string;
    items: MenuItem[];
    /** Optional: A unique ID for the menu background */
    id?: string;
    /** Position and size of the menu */
    layout: {
        x: number;
        y: number;
        width: number;
        height: number;
        padding?: number;
    };
    style?: {
        backgroundColor?: string;
        titleStyle?: TextStyleData;
        itemStyle?: TextStyleData;
    };
}

/**
 * "Smart Helper" for Screen-Space rendering.
 *
 * This class is a utility used by your GameState. It owns the
 * TextRenderer and provides methods to build all UI element commands
 * (Dialogue, Choices, HUD, Menus) at fixed screen coordinates.
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
     */
    buildDialogueCommands(line: DialogueLine, layout: 'bubble' | 'narrative'): RenderCommand[] {
        return this.textRenderer.buildDialogueCommands(line, layout);
    }

    /**
     * Generates commands for a list of choices.
     * (Delegates to TextRenderer)
     */
    buildChoiceCommands(choices: SceneChoice[]): RenderCommand[] {
        return this.textRenderer.buildChoiceCommands(choices);
    }

    /**
     * Generates commands for the Heads-Up Display (HUD).
     *
     * This is an example implementation for a health bar.
     * Your game's GameState would call this in its render() loop.
     */
    buildHudCommands(context: GameContext): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const player = context.game.player; // Assumes player is on the context

        // --- Example: Health Bar ---
        if (player && typeof player.health === 'number' && typeof player.maxHealth === 'number') {
            const barWidth = 200;
            const barHeight = 20;
            const xPos = 20;
            const yPos = 20;
            const zIndex = 10000; // UI is always on top

            // 1. Health bar background
            commands.push({
                type: 'rect',
                id: 'hud_health_bg',
                x: xPos,
                y: yPos,
                width: barWidth,
                height: barHeight,
                fill: '#440000', // Dark red
                zIndex: zIndex
            });

            // 2. Health bar foreground
            const healthPercentage = Math.max(0, player.health / player.maxHealth);
            commands.push({
                type: 'rect',
                id: 'hud_health_fg',
                x: xPos,
                y: yPos,
                width: barWidth * healthPercentage,
                height: barHeight,
                fill: '#00cc00', // Bright green
                zIndex: zIndex + 1 // On top of the background
            });

            // 3. Health text
            commands.push({
                type: 'text',
                id: 'hud_health_text',
                text: `HP: ${player.health} / ${player.maxHealth}`,
                x: xPos + 5,
                y: yPos + (barHeight / 2) + 5, // Simple vertical center
                style: { color: 'white', font: '12px Arial' },
                zIndex: zIndex + 2
            });
        }

        // ... Add commands for other HUD elements (e.g., score, clock) ...

        return commands;
    }

    /**
     * Generates commands for a generic game menu (e.g., Pause, Main Menu).
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