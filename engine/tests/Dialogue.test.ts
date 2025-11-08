// engine/tests/Dialogue.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { Dialogue } from '@engine/rendering/Dialogue';
import { DialogueLine } from '@engine/rendering/DialogueLine';

describe('Dialogue', () => {
    let dialogue: Dialogue;
    const line1 = new DialogueLine('narrator', 'Line 1');
    const line2 = new DialogueLine('player', 'Line 2');

    beforeEach(() => {
        dialogue = new Dialogue();
    });

    it('should initialize empty', () => {
        expect(dialogue.hasNext()).toBe(false);
        expect(dialogue.next()).toBeUndefined();
    });

    it('should add lines', () => {
        dialogue.addLine(line1);
        dialogue.addLine(line2);
        expect(dialogue.hasNext()).toBe(true);
        expect(dialogue.getProgress().total).toBe(2);
    });

    it('should iterate with next()', () => {
        dialogue.lines = [line1, line2];

        expect(dialogue.hasNext()).toBe(true);
        expect(dialogue.next()).toBe(line1);

        expect(dialogue.hasNext()).toBe(true);
        expect(dialogue.next()).toBe(line2);

        expect(dialogue.hasNext()).toBe(false);
        expect(dialogue.next()).toBeUndefined();
    });

    it('should reset progress', () => {
        dialogue.lines = [line1, line2];
        dialogue.next();
        expect(dialogue.getProgress().current).toBe(1);

        dialogue.reset();
        expect(dialogue.getProgress().current).toBe(0);
        expect(dialogue.next()).toBe(line1);
    });

    it('should get progress', () => {
        dialogue.lines = [line1, line2];

        expect(dialogue.getProgress()).toEqual({ current: 0, total: 2, percentage: 0 });

        dialogue.next();
        expect(dialogue.getProgress()).toEqual({ current: 1, total: 2, percentage: 50 });

        dialogue.next();
        expect(dialogue.getProgress()).toEqual({ current: 2, total: 2, percentage: 100 });
    });
});