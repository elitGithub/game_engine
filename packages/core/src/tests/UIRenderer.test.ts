// engine/tests/UIRenderer.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIRenderer } from '@game-engine/core/rendering/helpers/UIRenderer';
import { TextRenderer } from '@game-engine/core/rendering/helpers/TextRenderer';
import type { PositionedBar, PositionedDialogue, PositionedChoice, RenderCommand } from '@game-engine/core/types/RenderingTypes';
import { DEFAULT_Z_INDEX } from '@game-engine/core/constants/RenderingConstants';


// Mock dependencies
vi.mock('@game-engine/core/rendering/helpers/TextRenderer');

describe('UIRenderer', () => {
    let uiRenderer: UIRenderer;
    let mockTextRenderer: TextRenderer;

    beforeEach(() => {
        vi.clearAllMocks();

        // Get the mock instance of TextRenderer (no arguments)
        mockTextRenderer = new (vi.mocked(TextRenderer))();

        // Mock the TextRenderer constructor to return our instance
        vi.mocked(TextRenderer).mockImplementation(() => mockTextRenderer);

        // Spy on the helper methods
        vi.spyOn(mockTextRenderer, 'buildDialogueCommands').mockReturnValue([]);
        vi.spyOn(mockTextRenderer, 'buildChoiceCommands').mockReturnValue([]);

        uiRenderer = new UIRenderer();
    });

    it('should delegate dialogue rendering to TextRenderer', () => {
        const dialogueData = { id: 'diag1' } as PositionedDialogue;
        uiRenderer.buildDialogueCommands(dialogueData);
        expect(mockTextRenderer.buildDialogueCommands).toHaveBeenCalledWith(dialogueData);
    });

    it('should delegate choice rendering to TextRenderer', () => {
        const choiceData = [{ id: 'choice1' }] as PositionedChoice[];
        uiRenderer.buildChoiceCommands(choiceData);
        expect(mockTextRenderer.buildChoiceCommands).toHaveBeenCalledWith(choiceData);
    });

    it('should build commands for a bar', () => {
        const barData: PositionedBar = {
            id: 'health_bar',
            background: { x: 10, y: 10, width: 100, height: 20, fill: 'red' },
            foreground: { x: 10, y: 10, width: 50, height: 20, fill: 'green' },
            label: { text: 'HP', x: 15, y: 25, style: {} }
        };

        const commands = uiRenderer.buildBarCommands(barData);

        expect(commands).toHaveLength(3);
        const bgCmd = commands.find(c => c.type !== 'clear' && c.id === 'health_bar_bg') as Extract<RenderCommand, { type: 'rect' }>;
        const fgCmd = commands.find(c => c.type !== 'clear' && c.id === 'health_bar_fg') as Extract<RenderCommand, { type: 'rect' }>;
        const textCmd = commands.find(c => c.type !== 'clear' && c.id === 'health_bar_text') as Extract<RenderCommand, { type: 'text' }>;

        expect(bgCmd).toBeDefined();
        expect(fgCmd).toBeDefined();
        expect(textCmd).toBeDefined();

        expect(bgCmd.zIndex).toBe(DEFAULT_Z_INDEX.UI_BARS);
        expect(fgCmd.zIndex).toBe(DEFAULT_Z_INDEX.UI_BARS + 1);
        expect(textCmd.zIndex).toBe(DEFAULT_Z_INDEX.UI_BARS + 2);
    });

    it('should build commands for a text display', () => {
        const commands = uiRenderer.buildTextDisplayCommands({
            text: 'Hello',
            position: { x: 100, y: 50 }
        });

        expect(commands).toHaveLength(1);
        const cmd = commands[0] as Extract<RenderCommand, { type: 'text' }>;

        expect(cmd.type).toBe('text');
        expect(cmd.text).toBe('Hello');
        expect(cmd.x).toBe(100);
        expect(cmd.y).toBe(50);
    });

    it('should build commands for a menu', () => {
        const commands = uiRenderer.buildMenuCommands({
            id: 'main_menu',
            background: { x: 0, y: 0, width: 200, height: 300, fill: 'gray' },
            title: { text: 'Menu', x: 100, y: 20, style: {} },
            items: [
                {
                    id: 'item1',
                    text: { text: 'Start', x: 100, y: 50, style: {} },
                    hotspot: { x: 50, y: 40, width: 100, height: 30 },
                    data: { action: 'start' }
                }
            ]
        });

        expect(commands).toHaveLength(4); // bg, title, item1_text, item1_hotspot

        const bg = commands.find(c => c.type !== 'clear' && c.id === 'main_menu_bg') as Extract<RenderCommand, { type: 'rect' }>;
        const title = commands.find(c => c.type !== 'clear' && c.id === 'main_menu_title') as Extract<RenderCommand, { type: 'text' }>;
        const itemText = commands.find(c => c.type !== 'clear' && c.id === 'item1_text') as Extract<RenderCommand, { type: 'text' }>;
        const itemHotspot = commands.find(c => c.type !== 'clear' && c.id === 'item1_hotspot') as Extract<RenderCommand, { type: 'hotspot' }>;

        expect(bg.zIndex).toBe(DEFAULT_Z_INDEX.UI_MENUS);
        expect(title.zIndex).toBe(DEFAULT_Z_INDEX.UI_MENUS + 1);
        expect(itemText.zIndex).toBe(DEFAULT_Z_INDEX.UI_MENUS + 1);
        expect(itemHotspot.zIndex).toBe(DEFAULT_Z_INDEX.UI_MENUS + 2);
    });
});