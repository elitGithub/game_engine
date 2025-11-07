// engine/tests/UIRenderer.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIRenderer } from '@engine/rendering/helpers/UIRenderer';
import { SpeakerRegistry } from '@engine/rendering/SpeakerRegistry';
import { TextRenderer } from '@engine/rendering/helpers/TextRenderer';
import type { PositionedBar, PositionedDialogue, PositionedChoice, RenderCommand } from '@engine/types/RenderingTypes';

// Mock dependencies
vi.mock('@engine/rendering/SpeakerRegistry');
vi.mock('@engine/rendering/helpers/TextRenderer');

describe('UIRenderer', () => {
    let uiRenderer: UIRenderer;
    let mockSpeakerRegistry: SpeakerRegistry;
    let mockTextRenderer: TextRenderer;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSpeakerRegistry = new (vi.mocked(SpeakerRegistry))();

        // Get the mock instance of TextRenderer
        mockTextRenderer = new (vi.mocked(TextRenderer))(mockSpeakerRegistry);

        // Mock the TextRenderer constructor to return our instance
        vi.mocked(TextRenderer).mockImplementation(() => mockTextRenderer);

        // Spy on the helper methods
        vi.spyOn(mockTextRenderer, 'buildDialogueCommands').mockReturnValue([]);
        vi.spyOn(mockTextRenderer, 'buildChoiceCommands').mockReturnValue([]);

        uiRenderer = new UIRenderer(mockSpeakerRegistry);
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

        // --- FIX: Use a robust, multi-step check ---
        const bgCmd = commands.find(c => 'id' in c && c.id === 'health_bar_bg');
        const fgCmd = commands.find(c => 'id' in c && c.id === 'health_bar_fg');
        const textCmd = commands.find(c => 'id' in c && c.id === 'health_bar_text');

        // Step 1: Check they are defined
        expect(bgCmd).toBeDefined();
        expect(fgCmd).toBeDefined();
        expect(textCmd).toBeDefined();

        // Step 2: Assert their type and check properties
        expect(bgCmd?.type).toBe('rect');
        expect(fgCmd?.type).toBe('rect');
        expect(textCmd?.type).toBe('text');

        // Step 3: Access zIndex (now safe)
        expect((bgCmd as Extract<RenderCommand, { type: 'rect' }>).zIndex).toBe(10000);
        expect((fgCmd as Extract<RenderCommand, { type: 'rect' }>).zIndex).toBe(10001);
        expect((textCmd as Extract<RenderCommand, { type: 'text' }>).zIndex).toBe(10002);
    });

    it('should build commands for a text display', () => {
        const commands = uiRenderer.buildTextDisplayCommands({
            text: 'Hello',
            position: { x: 100, y: 50 }
        });

        expect(commands).toHaveLength(1);

        const cmd = commands[0];
        expect(cmd.type).toBe('text'); // Assert type

        // This pattern (if-check) is a valid type guard
        if (cmd.type === 'text') {
            expect(cmd.text).toBe('Hello');
            expect(cmd.x).toBe(100);
            expect(cmd.y).toBe(50);
        }
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

        // --- FIX: Use a robust, multi-step check ---
        const bg = commands.find(c => 'id' in c && c.id === 'main_menu_bg');
        const title = commands.find(c => 'id' in c && c.id === 'main_menu_title');
        const itemText = commands.find(c => 'id' in c && c.id === 'item1_text');
        const itemHotspot = commands.find(c => 'id' in c && c.id === 'item1_hotspot');

        // Step 1: Check they are defined
        expect(bg).toBeDefined();
        expect(title).toBeDefined();
        expect(itemText).toBeDefined();
        expect(itemHotspot).toBeDefined();

        // Step 2: Assert their type
        expect(bg?.type).toBe('rect');
        expect(title?.type).toBe('text');
        expect(itemText?.type).toBe('text');
        expect(itemHotspot?.type).toBe('hotspot');

        // Step 3: Access zIndex (now safe)
        expect((bg as Extract<RenderCommand, { type: 'rect' }>).zIndex).toBe(20000);
        expect((title as Extract<RenderCommand, { type: 'text' }>).zIndex).toBe(20001);
        expect((itemText as Extract<RenderCommand, { type: 'text' }>).zIndex).toBe(20001);
        expect((itemHotspot as Extract<RenderCommand, { type: 'hotspot' }>).zIndex).toBe(20002);
    });
});