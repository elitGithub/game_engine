// engine/tests/DialogueLayoutHelper.test.ts

// 'vi' is removed as it's not used
import { describe, it, expect, beforeEach } from 'vitest';
import { DialogueLayoutHelper } from '@engine/rendering/helpers/DialogueLayoutHelper';
import type { PositionedDialogue, RenderCommand } from '@engine/types/RenderingTypes';

describe('DialogueLayoutHelper', () => {
    let helper: DialogueLayoutHelper;

    beforeEach(() => {
        // The constructor's 'speakerRegistry' is not used by buildCommands,
        // so we can safely pass a mock.
        helper = new DialogueLayoutHelper(null as any);
    });

    it('should build commands for a full dialogue line', () => {
        const dialogueData: PositionedDialogue = {
            id: 'diag1',
            background: { x: 10, y: 400, width: 780, height: 200, fill: 'black' },
            speaker: { text: 'Player', x: 20, y: 420, style: { color: '#FFF' } },
            text: { text: 'Hello world', x: 20, y: 450, style: { color: '#FFF' } },
            portrait: { assetId: 'player_portrait', x: 600, y: 300, width: 100, height: 100 },
            zIndex: 1000
        };

        const commands = helper.buildCommands(dialogueData);

        expect(commands).toHaveLength(4);

        // --- FIX: Use a type-safe check to find commands ---
        // This ensures we only find commands that have an 'id' property.
        const bg = commands.find(c => 'id' in c && c.id === 'diag1_bg') as Extract<RenderCommand, { type: 'rect' }>;
        const speaker = commands.find(c => 'id' in c && c.id === 'diag1_speaker') as Extract<RenderCommand, { type: 'text' }>;
        const text = commands.find(c => 'id' in c && c.id === 'diag1_text') as Extract<RenderCommand, { type: 'text' }>;
        const portrait = commands.find(c => 'id' in c && c.id === 'diag1_portrait') as Extract<RenderCommand, { type: 'sprite' }>;

        // Check that all commands were found
        expect(bg).toBeDefined();
        expect(speaker).toBeDefined();
        expect(text).toBeDefined();
        expect(portrait).toBeDefined();

        // Check z-indexing (now type-safe)
        expect(bg.zIndex).toBe(1000);
        expect(speaker.zIndex).toBe(1001);
        expect(text.zIndex).toBe(1001);
        expect(portrait.zIndex).toBe(1001);

        // Check content
        expect(text.text).toBe('Hello world');
        expect(portrait.assetId).toBe('player_portrait');
    });

    it('should build commands for a minimal dialogue line (e.g., narrator)', () => {
        const dialogueData: PositionedDialogue = {
            id: 'diag2',
            text: { text: 'The wind blows...', x: 20, y: 450, style: { color: '#CCC' } },
            zIndex: 2000
        };

        const commands = helper.buildCommands(dialogueData);

        expect(commands).toHaveLength(1);

        const text = commands[0] as Extract<RenderCommand, { type: 'text' }>;

        expect(text.id).toBe('diag2_text');
        expect(text.text).toBe('The wind blows...');
        expect(text.zIndex).toBe(2001);
    });

    it('should handle missing zIndex', () => {
        const dialogueData: PositionedDialogue = {
            id: 'diag3',
            background: { x: 0, y: 0, width: 100, height: 100, fill: 'black' },
            text: { text: 'No zIndex', x: 10, y: 10, style: {} }
            // zIndex is undefined
        };

        const commands = helper.buildCommands(dialogueData);

        expect(commands).toHaveLength(2);

        // --- FIX: Use the same type-safe find ---
        const bg = commands.find(c => 'id' in c && c.id === 'diag3_bg') as Extract<RenderCommand, { type: 'rect' }>;
        const text = commands.find(c => 'id' in c && c.id === 'diag3_text') as Extract<RenderCommand, { type: 'text' }>;

        // Should default to 1000 and 1001
        expect(bg.zIndex).toBe(1000);
        expect(text.zIndex).toBe(1001);
    });
});