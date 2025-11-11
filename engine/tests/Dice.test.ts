// engine/tests/Dice.test.ts

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Dice} from '@engine/utils/Dice';

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
        // Create a local mock function. No global state is touched.
        const mockRng = vi.fn().mockReturnValue(0);

        // Pass the mock RNG directly into the method.
        const result = Dice.roll(6, mockRng);

        expect(result).toBe(1);
        expect(mockRng).toHaveBeenCalledOnce();
    });

    it('should roll a 20', () => {
        // 1. Create a local mock RNG. No global state is touched.
        const mockRng = vi.fn().mockReturnValue(0.99);

        // 2. Pass the mock RNG directly into the method.
        const result = Dice.roll(20, mockRng);

        // 3. The assertion remains the same.
        expect(result).toBe(20);

        // 4. (Optional but good) You can also assert the mock was called.
        expect(mockRng).toHaveBeenCalledOnce();
    });

    it('should roll multiple dice and return the sum', () => {
        // 1. Create a LOCAL mock function. It's just a variable.
        const mockRng = vi.fn()
            .mockReturnValueOnce(0.5) // 4
            .mockReturnValueOnce(0.1) // 1
            .mockReturnValueOnce(0.8); // 5

        // 2. Pass your local mock IN as an argument.
        const result = Dice.rollSum(3, 6, mockRng); // 4 + 1 + 5

        // 3. The result is the same.
        expect(result).toBe(10);

        // 4. You check your LOCAL mock, not the global one.
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
});