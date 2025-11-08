// engine/tests/DialogueLine.test.ts

import { describe, it, expect } from 'vitest';
import { DialogueLine } from '@engine/rendering/DialogueLine';

describe('DialogueLine', () => {
    it('should store speaker and text', () => {
        const line = new DialogueLine('player', 'Hello');
        expect(line.speakerId).toBe('player');
        expect(line.text).toBe('Hello');
    });

    it('should have default options', () => {
        const line = new DialogueLine('player', 'Hello');
        expect(line.options.showPortrait).toBe(true);
        expect(line.options.showName).toBe(true);
        expect(line.options.style).toBeUndefined();
    });

    it('should respect provided options', () => {
        const style = { color: 'red' };
        const line = new DialogueLine('player', 'Hello', {
            showName: false,
            style: style
        });

        expect(line.options.showPortrait).toBe(true);
        expect(line.options.showName).toBe(false);
        expect(line.options.style).toBe(style);
    });
});