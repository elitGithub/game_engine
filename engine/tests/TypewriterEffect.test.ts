// engine/tests/TypewriterEffect.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypewriterEffect } from '@engine/rendering/helpers/TypewriterEffect';
import type { IEffectTarget } from '@engine/types/EffectTypes';
import {ILogger} from "@engine/interfaces";

// Mock IEffectTarget
const mockTarget: IEffectTarget = {
    id: 'testTarget',
    getProperty: vi.fn(),
    setProperty: vi.fn(),
    getRaw: vi.fn(),
};
    const mockLogger: ILogger = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
describe('TypewriterEffect', () => {
    let effect: TypewriterEffect;
    // 5 chars per second = 200ms (0.2s) per char
    const charsPerSecond = 5;
    const timePerChar = 1.0 / charsPerSecond; // 0.2s
    const punctuationDelay = 0.3; // 300ms

    beforeEach(() => {
        vi.clearAllMocks();
        effect = new TypewriterEffect({ charsPerSecond: charsPerSecond, punctuationDelay: 300 });
        vi.mocked(mockTarget.getProperty).mockReturnValue('Hello!');
        effect.onStart(mockTarget, {} as any, mockLogger);
    });

    it('should start with blank text', () => {
        expect(mockTarget.getProperty).toHaveBeenCalledWith('textContent');
        expect(mockTarget.setProperty).toHaveBeenCalledWith('textContent', '');
    });

    it('should add one character per update tick', () => {
        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger); // 0.2s
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'H');

        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger); // 0.4s
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'He');
    });

    it('should handle multiple characters in one long frame', () => {
        effect.onUpdate(mockTarget, {} as any, timePerChar * 3, mockLogger); // 0.6s
        // Should process 3 chars: 'H', 'e', 'l'
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'Hel');
    });

    it('should add punctuation delay', () => {
        const text = "Hi. Bye";
        vi.mocked(mockTarget.getProperty).mockReturnValue(text);

        effect.onStart(mockTarget, {} as any, mockLogger); // fullText is "Hi. Bye"

        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger); // "H"
        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger); // "Hi"

        // After this call, the last text is "Hi".
        // The *next* character is '.', so the delay is now (timePerChar + punctuationDelay)
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'Hi');

        // This update is NOT enough to overcome the punctuation delay
        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger);
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'Hi'); // Still "Hi"

        // This update *is* enough time
        // (timePerChar for the char itself + punctuationDelay)
        effect.onUpdate(mockTarget, {} as any, punctuationDelay, mockLogger);

        // Now it should have processed the "."
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'Hi.');
    });

    it('should complete text onStop', () => {
        effect.onUpdate(mockTarget, {} as any, timePerChar, mockLogger); // "H"
        effect.onStop(mockTarget, {} as any, mockLogger);
        expect(mockTarget.setProperty).toHaveBeenLastCalledWith('textContent', 'Hello!');
    });

    it('should do nothing on update if complete', () => {
        effect.onStop(mockTarget, {} as any, mockLogger); // Completes text
        vi.clearAllMocks(); // Clear setProperty calls

        effect.onUpdate(mockTarget, {} as any, 1.0, mockLogger);
        expect(mockTarget.setProperty).not.toHaveBeenCalled();
    });
});