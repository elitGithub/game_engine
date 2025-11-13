/**
 * A function that returns a random number between 0 (inclusive) and 1 (exclusive).
 * This matches the signature of Math.random().
 */
type RngFunction = () => number;

/**
 * Dice - Utility for all dice rolling in the game
 */
export class Dice {
    /**
     * Roll a single die
     */
    static roll(sides: number = 6, rng: RngFunction = Math.random): number {
        return Math.floor(rng() * sides) + 1;
    }

    /**
     * Roll multiple dice and return the sum
     */
    static rollSum(count: number = 1, sides: number = 6, rng: RngFunction = Math.random): number {
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += this.roll(sides, rng);
        }
        return total;
    }

    /**
     * Roll multiple dice and return individual results
     */
    static rollMultiple(count: number = 1, sides: number = 6, rng: RngFunction = Math.random): number[] {
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
            results.push(this.roll(sides, rng));
        }
        return results;
    }

    /**
     * Roll a d100 (percentile)
     */
    static d100(rng: RngFunction = Math.random): number {
        return this.roll(100, rng);
    }

    /**
     * Roll with advantage (roll twice, take higher)
     */
    static rollAdvantage(sides: number = 6, rng: RngFunction = Math.random): number {
        const roll1 = this.roll(sides, rng);
        const roll2 = this.roll(sides, rng);
        return Math.max(roll1, roll2);
    }

    /**
     * Roll with disadvantage (roll twice, take lower)
     */
    static rollDisadvantage(sides: number = 6, rng: RngFunction = Math.random): number {
        const roll1 = this.roll(sides, rng);
        const roll2 = this.roll(sides, rng);
        return Math.min(roll1, roll2);
    }
}
