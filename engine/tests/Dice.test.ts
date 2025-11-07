// engine/tests/Dice.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Dice } from '@engine/utils/Dice';

describe('Dice', () => {

    beforeEach(() => {
        // Mock Math.random() to return predictable values
        vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should roll a single d6', () => {
        vi.mocked(Math.random).mockReturnValue(0.5); // 0.5 * 6 = 3, floor = 3, + 1 = 4
        const result = Dice.roll(6);
        expect(result).toBe(4);
    });

    it('should roll a 1', () => {
        vi.mocked(Math.random).mockReturnValue(0); // 0 * 6 = 0, floor = 0, + 1 = 1
        const result = Dice.roll(6);
        expect(result).toBe(1);
    });

    it('should roll a 20', () => {
        vi.mocked(Math.random).mockReturnValue(0.99); // 0.99 * 20 = 19.8, floor = 19, + 1 = 20
        const result = Dice.roll(20);
        expect(result).toBe(20);
    });

    it('should roll multiple dice and return the sum', () => {
        vi.mocked(Math.random)
            .mockReturnValueOnce(0.5) // 4
            .mockReturnValueOnce(0.1) // 1
            .mockReturnValueOnce(0.8); // 5

        const result = Dice.rollSum(3, 6); // 4 + 1 + 5
        expect(result).toBe(10);
        expect(Math.random).toHaveBeenCalledTimes(3);
    });

    it('should roll multiple dice and return individual results', () => {
        vi.mocked(Math.random)
            .mockReturnValueOnce(0.5) // 4
            .mockReturnValueOnce(0.1); // 1

        const result = Dice.rollMultiple(2, 6);
        expect(result).toEqual([4, 1]);
    });

    it('should roll with advantage (take higher)', () => {
        vi.mocked(Math.random)
            .mockReturnValueOnce(0.1) // 3 (d20)
            .mockReturnValueOnce(0.8); // 17 (d20)

        const result = Dice.rollAdvantage(20);
        expect(result).toBe(17);
    });

    it('should roll with disadvantage (take lower)', () => {
        vi.mocked(Math.random)
            .mockReturnValueOnce(0.1) // 3 (d20)
            .mockReturnValueOnce(0.8); // 17 (d20)

        const result = Dice.rollDisadvantage(20);
        expect(result).toBe(3);
    });
});