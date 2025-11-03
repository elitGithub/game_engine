/**
 * Dialogue - Represents a sequence of dialogue lines
 */
import { DialogueLine } from './DialogueLine';

export class Dialogue {
    public lines: DialogueLine[];
    public currentIndex: number;

    constructor(lines: DialogueLine[] = []) {
        this.lines = lines;
        this.currentIndex = 0;
    }

    /**
     * Add a line to the dialogue
     */
    addLine(line: DialogueLine): void {
        this.lines.push(line);
    }

    /**
     * Get the next line
     */
    next(): DialogueLine | undefined {
        if (this.hasNext()) {
            return this.lines[this.currentIndex++];
        }
        return undefined;
    }

    /**
     * Check if there are more lines
     */
    hasNext(): boolean {
        return this.currentIndex < this.lines.length;
    }

    /**
     * Reset to beginning
     */
    reset(): void {
        this.currentIndex = 0;
    }

    /**
     * Get current progress
     */
    getProgress(): { current: number; total: number; percentage: number } {
        return {
            current: this.currentIndex,
            total: this.lines.length,
            percentage: (this.currentIndex / this.lines.length) * 100
        };
    }
}