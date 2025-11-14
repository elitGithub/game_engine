/**
 * Dialogue - Represents a sequence of dialogue lines
 */
import { DialogueLine } from './DialogueLine';

export class Dialogue {
    private _lines: DialogueLine[];
    private currentIndex: number;

    constructor(lines: DialogueLine[] = []) {
        this._lines = lines;
        this.currentIndex = 0;
    }

    public get lines(): readonly DialogueLine[] {
        return this._lines;
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * Add a line to the dialogue
     */
    addLine(line: DialogueLine): void {
        this._lines.push(line);
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
            percentage: this.lines.length === 0 ? 0 : (this.currentIndex / this.lines.length) * 100
        };
    }
}