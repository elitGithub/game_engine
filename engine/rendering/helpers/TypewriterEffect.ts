import type { GameContext } from '@engine/types';
import type { IDynamicEffect, IEffectTarget } from '@engine/types/EffectTypes';

export class TypewriterEffect implements IDynamicEffect {
    private fullText: string = '';
    private charIndex: number = 0;

    // State for deltaTime-based animation
    private readonly timePerChar: number = 0;
    private readonly punctuationDelay: number = 200; // in ms
    private timeAccumulator: number = 0;
    private currentDelay: number = 0; // Current delay (for punctuation)

    // Configurable
    private readonly charsPerSecond: number = 30;

    constructor(config: { charsPerSecond?: number, punctuationDelay?: number } = {}) {
        this.charsPerSecond = config.charsPerSecond || 30;
        this.punctuationDelay = config.punctuationDelay || 200;
        this.timePerChar = 1.0 / this.charsPerSecond; // Time in seconds per char
    }

    // FIX: Prefixed unused 'context' parameter with '_' to satisfy TS6133
    onStart(target: IEffectTarget, _context: GameContext<any>): void {
        const element = target.getRaw() as HTMLElement;
        if (!element || typeof element.textContent === 'undefined') {
            console.warn('[TypewriterEffect] Target is not an HTMLElement. Skipping.');
            return;
        }

        // Initialize or re-initialize state
        this.fullText = element.textContent || '';
        this.charIndex = 0;
        this.timeAccumulator = 0;
        this.currentDelay = this.timePerChar;

        // Set the initial state (blank text)
        target.setProperty('textContent', '');
    }

    /**
     * This is now the core logic loop, driven by the engine's EffectManager.
     */
    // FIX: Prefixed unused 'context' parameter with '_' to satisfy TS6133
    onUpdate(target: IEffectTarget, _context: GameContext<any>, deltaTime: number): void {
        if (this.charIndex >= this.fullText.length) {
            return; // Effect is complete
        }

        this.timeAccumulator += deltaTime;

        // Keep processing characters as long as time has elapsed
        while (this.timeAccumulator >= this.currentDelay) {
            if (this.charIndex >= this.fullText.length) {
                break; // Stop if we finish mid-frame
            }

            // Subtract the delay for this char
            this.timeAccumulator -= this.currentDelay;

            // Advance one character
            this.charIndex++;
            const currentText = this.fullText.substring(0, this.charIndex);
            target.setProperty('textContent', currentText);

            // Set the delay for the *next* character
            if (this.charIndex < this.fullText.length) {
                const nextChar = this.fullText[this.charIndex];
                if (this.isPunctuation(nextChar)) {
                    this.currentDelay = this.timePerChar + (this.punctuationDelay / 1000);
                } else {
                    this.currentDelay = this.timePerChar;
                }
            }
        }
    }

    // FIX: Prefixed unused 'context' parameter with '_' to satisfy TS6133
    onStop(target: IEffectTarget, _context: GameContext<any>): void {
        // When stopped, instantly complete the text
        target.setProperty('textContent', this.fullText);
        // Mark as complete
        this.charIndex = this.fullText.length;
    }

    private isPunctuation(char: string): boolean {
        return /[.!?,;:]/.test(char);
    }
}