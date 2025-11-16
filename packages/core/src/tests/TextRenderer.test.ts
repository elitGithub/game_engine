// engine/tests/TextRenderer.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextRenderer } from '@game-engine/core/rendering/helpers/TextRenderer';
import { DialogueLayoutHelper } from '@game-engine/core/rendering/helpers/DialogueLayoutHelper';
import { ChoiceLayoutHelper } from '@game-engine/core/rendering/helpers/ChoiceLayoutHelper';

// Mock the helpers
vi.mock('@game-engine/core/rendering/helpers/DialogueLayoutHelper');
vi.mock('@game-engine/core/rendering/helpers/ChoiceLayoutHelper');

describe('TextRenderer', () => {
    let textRenderer: TextRenderer;

    let mockDialogueHelper: DialogueLayoutHelper;
    let mockChoiceHelper: ChoiceLayoutHelper;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(DialogueLayoutHelper).mockClear();
        vi.mocked(ChoiceLayoutHelper).mockClear();

        // We cast a plain object with mocked methods to the class type.
        mockDialogueHelper = {
            buildCommands: vi.fn().mockReturnValue([{ type: 'text' } as any])
        } as unknown as DialogueLayoutHelper;

        mockChoiceHelper = {
            buildCommands: vi.fn().mockReturnValue([{ type: 'hotspot' } as any])
        } as unknown as ChoiceLayoutHelper;

        // When DialogueLayoutHelper is called via `new`, return our mock instance.
        vi.mocked(DialogueLayoutHelper).mockImplementation(() => mockDialogueHelper);
        vi.mocked(ChoiceLayoutHelper).mockImplementation(() => mockChoiceHelper);

        // TextRenderer creates its own helpers internally
        textRenderer = new TextRenderer();
    });

    it('should instantiate helpers on construction', () => {
        // --- This test will now pass, as the constructors were called exactly once ---
        expect(vi.mocked(DialogueLayoutHelper)).toHaveBeenCalledOnce();
        expect(vi.mocked(ChoiceLayoutHelper)).toHaveBeenCalledOnce();
    });

    it('should delegate buildDialogueCommands', () => {
        const dialogueData = { id: 'diag1' } as any;
        const result = textRenderer.buildDialogueCommands(dialogueData);

        // Check that the method on our *mock instance* was called
        expect(mockDialogueHelper.buildCommands).toHaveBeenCalledWith(dialogueData);
        expect(result).toEqual([{ type: 'text' }]);
    });

    it('should delegate buildChoiceCommands', () => {
        const choiceData = [{ id: 'choice1' }] as any;
        const result = textRenderer.buildChoiceCommands(choiceData);

        // Check that the method on our *mock instance* was called
        expect(mockChoiceHelper.buildCommands).toHaveBeenCalledWith(choiceData);
        expect(result).toEqual([{ type: 'hotspot' }]);
    });
});