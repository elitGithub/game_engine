import type {TypedGameContext} from '@engine/types';
import type {IDynamicEffect, IEffectTarget} from '@engine/types/EffectTypes';
import {ILogger} from "@engine/interfaces/ILogger";

export class TypewriterEffect implements IDynamicEffect {
    private fullText: string = '';
    private charIndex: number = 0;

    // State for deltaTime-based animation
    private readonly timePerChar: number = 0;
    private readonly punctuationDelay: number = 0; // in ms
    private timeAccumulator: number = 0;
    private currentDelay: number = 0; // Current delay (for punctuation)

    // Configurable
    private readonly charsPerSecond: number = Infinity;

    constructor(config: { charsPerSecond?: number, punctuationDelay?: number } = {}) {
        const cps = config.charsPerSecond ?? 30; // Default to 30 chars/second

        // Validation: Ensure finite positive number or Infinity
        if (Number.isNaN(cps)) {
            throw new Error('[TypewriterEffect] charsPerSecond cannot be NaN');
        }
        if (cps < 0) {
            throw new Error('[TypewriterEffect] charsPerSecond cannot be negative');
        }
        if (!Number.isFinite(cps) && cps !== Infinity) {
            throw new Error(`[TypewriterEffect] Invalid charsPerSecond: ${cps}`);
        }

        // Normalize: 0 means instant = Infinity (for convenience)
        this.charsPerSecond = cps === 0 ? Infinity : cps;

        this.punctuationDelay = config.punctuationDelay ?? 0;
        this.timePerChar = this.charsPerSecond === Infinity ? 0 : (1.0 / this.charsPerSecond);
    }


    onStart(target: IEffectTarget, _context: TypedGameContext<any>, logger: ILogger): void {
        // Use the IEffectTarget interface, not getRaw()
        const fullText = target.getProperty<string>('textContent');

        // Check if the property exists on the target
        if (typeof fullText === 'undefined') {
            logger.warn(`[TypewriterEffect] Target '${target.id}' does not have a 'textContent' property. Skipping.`);
            return;
        }

        // Initialize or re-initialize state
        this.fullText = fullText || ''; // Use the value from the interface
        this.charIndex = 0;
        this.timeAccumulator = 0;
        this.currentDelay = this.timePerChar;

        // Instant mode (Infinity): Display full text immediately, skip animation
        if (this.charsPerSecond === Infinity) {
            target.setProperty('textContent', this.fullText);
            this.charIndex = this.fullText.length; // Mark as complete
        } else {
            // Normal mode: Start with blank text
            target.setProperty('textContent', '');
        }
    }

    /**
     * This is now the core logic loop, driven by the engine's EffectManager.
     */
    // FIX: Prefixed unused 'context' parameter with '_' to satisfy TS6133
    onUpdate(target: IEffectTarget, _context: TypedGameContext<any>, deltaTime: number, logger: ILogger): void {
        // Instant mode: Skip animation loop (text already displayed in onStart)
        if (this.charsPerSecond === Infinity) {
            return;
        }

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
    onStop(target: IEffectTarget, _context: TypedGameContext<any>, logger: ILogger): void {
        // When stopped, instantly complete the text
        target.setProperty('textContent', this.fullText);
        // Mark as complete
        this.charIndex = this.fullText.length;
    }

    private isPunctuation(char: string): boolean {
        return /[.!?,;:]/.test(char);
    }
}