/**
 * Dice - Utility for all dice rolling in the game
 */
export class Dice {
    /**
     * Roll a single die
     */
    static roll(sides: number = 6): number {
        return Math.floor(Math.random() * sides) + 1;
    }

    /**
     * Roll multiple dice and return the sum
     */
    static rollSum(count: number = 1, sides: number = 6): number {
        let total = 0;
        for (let i = 0; i < count; i++) {
            total += this.roll(sides);
        }
        return total;
    }

    /**
     * Roll multiple dice and return individual results
     */
    static rollMultiple(count: number = 1, sides: number = 6): number[] {
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
            results.push(this.roll(sides));
        }
        return results;
    }

    /**
     * Roll a d100 (percentile)
     */
    static d100(): number {
        return this.roll(100);
    }

    /**
     * Roll with advantage (roll twice, take higher)
     */
    static rollAdvantage(sides: number = 6): number {
        const roll1 = this.roll(sides);
        const roll2 = this.roll(sides);
        return Math.max(roll1, roll2);
    }

    /**
     * Roll with disadvantage (roll twice, take lower)
     */
    static rollDisadvantage(sides: number = 6): number {
        const roll1 = this.roll(sides);
        const roll2 = this.roll(sides);
        return Math.min(roll1, roll2);
    }
}
