import { describe, it, expect } from 'vitest';
import { ChoiceLayoutHelper } from '@engine/rendering/helpers/ChoiceLayoutHelper';
import type { PositionedChoice, RenderCommand } from '@engine/types/RenderingTypes';

describe('ChoiceLayoutHelper', () => {

    it('should return an empty array for no choices', () => {
        const helper = new ChoiceLayoutHelper();
        const commands = helper.buildCommands([]);
        expect(commands).toEqual([]);
    });

    it('should generate text and hotspot commands for a single choice', () => {
        const helper = new ChoiceLayoutHelper();
        const mockChoice: PositionedChoice = {
            id: 'choice_1',
            text: 'Go North',
            textPos: { x: 100, y: 150 },
            hotspot: { x: 90, y: 130, width: 200, height: 40 },
            data: { target: 'scene_2' }
        };

        const commands = helper.buildCommands([mockChoice]);

        // Should create 2 commands: one text, one hotspot
        expect(commands).toHaveLength(2);

        const textCmd = commands.find(c => c.type === 'text') as Extract<RenderCommand, { type: 'text' }>;
        const hotspotCmd = commands.find(c => c.type === 'hotspot') as Extract<RenderCommand, { type: 'hotspot' }>;

        // Check text command
        expect(textCmd).toBeDefined();
        expect(textCmd.id).toBe('choice_1_text');
        expect(textCmd.text).toBe('Go North');
        expect(textCmd.x).toBe(100);
        expect(textCmd.y).toBe(150);
        expect(textCmd.zIndex).toBe(15001);

        // Check hotspot command
        expect(hotspotCmd).toBeDefined();
        expect(hotspotCmd.id).toBe('choice_1_hotspot');
        expect(hotspotCmd.x).toBe(90);
        expect(hotspotCmd.y).toBe(130);
        expect(hotspotCmd.width).toBe(200);
        expect(hotspotCmd.height).toBe(40);
        expect(hotspotCmd.data).toEqual({ target: 'scene_2' });
        expect(hotspotCmd.zIndex).toBe(15002);
    });

    // --- NEW TEST ---
    it('should generate commands for multiple choices', () => {
        const helper = new ChoiceLayoutHelper();
        const choices: PositionedChoice[] = [
            {
                id: 'choice_1',
                text: 'Go North',
                textPos: { x: 100, y: 150 },
                hotspot: { x: 90, y: 130, width: 200, height: 40 },
                data: { target: 'scene_2' }
            },
            {
                id: 'choice_2',
                text: 'Go South',
                textPos: { x: 100, y: 200 },
                hotspot: { x: 90, y: 180, width: 200, height: 40 },
                data: { target: 'scene_3' }
            }
        ];

        const commands = helper.buildCommands(choices);

        // Should create 4 commands: 2 text, 2 hotspot
        expect(commands).toHaveLength(4);
        expect(commands.filter(c => c.type === 'text')).toHaveLength(2);
        expect(commands.filter(c => c.type === 'hotspot')).toHaveLength(2);

        const text2 = commands.find(c => c.type !== 'clear' && c.id === 'choice_2_text') as Extract<RenderCommand, { type: 'text' }>;
        expect(text2).toBeDefined();
        expect(text2.y).toBe(200);
    });
});