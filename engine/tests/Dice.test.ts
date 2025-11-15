// engine/tests/Dice.test.ts

// 'afterEach' and 'beforeEach' are no longer needed
import { describe, expect, it, vi } from 'vitest';
import { Dice } from '@engine/utils/Dice';

describe('Dice', () => {
    // The beforeEach and afterEach hooks have been removed.

    it('should roll a single d6', () => {
        const mockRng = vi.fn().mockReturnValue(0);
        const result = Dice.roll(6, mockRng);
        expect(result).toBe(1);
    });

    it('should roll a 1', () => {
        const mockRng = vi.fn().mockReturnValue(0);
        const result = Dice.roll(6, mockRng);
        expect(result).toBe(1);
        expect(mockRng).toHaveBeenCalledOnce();
    });

    it('should roll a 20', () => {
        const mockRng = vi.fn().mockReturnValue(0.99);
        const result = Dice.roll(20, mockRng);
        expect(result).toBe(20);
        expect(mockRng).toHaveBeenCalledOnce();
    });

    it('should roll multiple dice and return the sum', () => {
        const mockRng = vi.fn()
            .mockReturnValueOnce(0.5) // 4
            .mockReturnValueOnce(0.1) // 1
            .mockReturnValueOnce(0.8); // 5

        const result = Dice.rollSum(3, 6, mockRng); // 4 + 1 + 5
        expect(result).toBe(10);
        expect(mockRng).toHaveBeenCalledTimes(3);
    });

    it('should roll multiple dice and return individual results', () => {
        const mockRng = vi.fn()
            .mockReturnValueOnce(0.5) // 4
            .mockReturnValueOnce(0.1); // 1

        const result = Dice.rollMultiple(2, 6, mockRng);
        expect(result).toEqual([4, 1]);
    });

    it('should roll with advantage (take higher)', () => {
        const mockRng = vi.fn()
            .mockReturnValueOnce(0.1) // 3 (d20)
            .mockReturnValueOnce(0.8); // 17 (d20)

        const result = Dice.rollAdvantage(20, mockRng);
        expect(result).toBe(17);
    });

    it('should roll with disadvantage (take lower)', () => {
        const mockRng = vi.fn()
            .mockReturnValueOnce(0.1) // 3 (d20)
            .mockReturnValueOnce(0.8); // 17 (d20)

        const result = Dice.rollDisadvantage(20, mockRng);
        expect(result).toBe(3);
    });

    // BONUS TEST:
    // This test verifies the default behavior (when no mock is passed)
    // without actually mocking Math.random.
    it('should use Math.random by default and return a valid number', () => {
        // No mock RNG is passed, so it uses the default Math.random
        const result = Dice.roll(100);

        // We can't know the exact value, but we can validate its properties
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result)).toBe(true);
    });
});