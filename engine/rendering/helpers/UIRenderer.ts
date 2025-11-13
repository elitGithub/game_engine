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
import { DEFAULT_Z_INDEX } from '@engine/constants/RenderingConstants';

/**
 * UIRenderer - Platform-agnostic screen-space UI rendering command factory.
 *
 * Pure translation layer that converts pre-positioned game UI data into
 * platform-agnostic render commands. Does not manipulate DOM or perform
 * any platform-specific rendering operations.
 *
 * Provides unified interface for generating render commands for all UI elements
 * including dialogue, choices, bars, text displays, and menus. Delegates text
 * rendering to TextRenderer for specialized handling.
 *
 * Z-Index Layering:
 * Uses DEFAULT_Z_INDEX constants for predictable layering. Developers can override
 * any z-index value explicitly. See @engine/constants/RenderingConstants for details.
 *
 * @example
 * ```typescript
 * import { UIRenderer } from '@engine/rendering/helpers/UIRenderer';
 * import { DEFAULT_Z_INDEX } from '@engine/constants/RenderingConstants';
 *
 * const uiRenderer = new UIRenderer();
 *
 * // Render dialogue
 * const dialogueCommands = uiRenderer.buildDialogueCommands(positionedDialogue);
 *
 * // Render health bar with default z-index (UI_BARS = 10000)
 * const barCommands = uiRenderer.buildBarCommands(positionedHealthBar);
 *
 * // Render menu with custom z-index
 * const menuCommands = uiRenderer.buildMenuCommands({
 *   ...positionedMenu,
 *   zIndex: DEFAULT_Z_INDEX.OVERLAY // Override default
 * });
 *
 * renderer.execute([...dialogueCommands, ...barCommands, ...menuCommands]);
 * ```
 */
export class UIRenderer {
    private textRenderer: TextRenderer;

    constructor() {
        this.textRenderer = new TextRenderer();
    }

    /**
     * Generates render commands for a dialogue line.
     *
     * Delegates to TextRenderer for specialized dialogue rendering including
     * background, speaker name, dialogue text, and optional portrait.
     *
     * @param dialogue - Pre-positioned dialogue data containing all geometry and styling information
     * @returns Array of render commands for all dialogue visual elements
     */
    buildDialogueCommands(dialogue: PositionedDialogue): RenderCommand[] {
        return this.textRenderer.buildDialogueCommands(dialogue);
    }

    /**
     * Generates render commands for a list of player choices.
     *
     * Delegates to TextRenderer for specialized choice rendering including
     * text labels and interactive hotspot areas.
     *
     * @param choices - Array of pre-positioned choice data containing geometry and interaction information
     * @returns Array of render commands for all choice visual elements and hotspots
     */
    buildChoiceCommands(choices: PositionedChoice[]): RenderCommand[] {
        return this.textRenderer.buildChoiceCommands(choices);
    }

    /**
     * Generates render commands for a progress or resource bar UI element.
     *
     * Creates commands for background rectangle, foreground fill rectangle based on
     * current value, and optional text label. Commonly used for health bars, mana bars,
     * experience bars, or loading indicators.
     *
     * Default z-index: DEFAULT_Z_INDEX.UI_BARS (10000)
     *
     * @param barData - Pre-positioned bar data including background, foreground, and optional label geometry
     * @returns Array of render commands for bar background, foreground, and optional label text
     */
    buildBarCommands(barData: PositionedBar): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = barData.zIndex ?? DEFAULT_Z_INDEX.UI_BARS;

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

    /**
     * Generates render commands for a simple text display element.
     *
     * Creates a single text command for displaying arbitrary text with optional
     * styling. Useful for labels, captions, or any simple text that doesn't require
     * the full dialogue rendering system.
     *
     * Default z-index: DEFAULT_Z_INDEX.UI_BARS (10000)
     *
     * @param textData - Text display data including text content, position, styling, and z-index
     * @returns Array containing a single text render command
     */
    buildTextDisplayCommands(textData: TextDisplayData): RenderCommand[] {
        const { text, position, id = 'text_display', style = {}, zIndex = DEFAULT_Z_INDEX.UI_BARS } = textData;

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
     * Generates render commands for a menu UI element.
     *
     * Creates commands for menu background, optional title, and all menu items
     * with their text labels and interactive hotspot areas. Supports generic
     * data attachment to hotspots for platform-specific event handling.
     *
     * Commonly used for pause menus, settings menus, inventory screens, or any
     * list-based selection interface.
     *
     * Default z-index: DEFAULT_Z_INDEX.UI_MENUS (20000)
     *
     * @param menuData - Pre-positioned menu data including background, title, and menu items with hotspots
     * @returns Array of render commands for menu background, title, item labels, and interactive hotspots
     */
    buildMenuCommands(menuData: PositionedMenu): RenderCommand[] {
        const commands: RenderCommand[] = [];
        const zIndex = menuData.zIndex ?? DEFAULT_Z_INDEX.UI_MENUS;

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