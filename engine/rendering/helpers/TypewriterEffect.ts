import type {TypedGameContext} from '@engine/types';
import type {IDynamicEffect, IEffectTarget} from '@engine/types/EffectTypes';
import type {ILogger} from "@engine/interfaces/ILogger";

/**
 * TypewriterEffect - Time-based text reveal animation effect.
 *
 * Implements IDynamicEffect to provide character-by-character text reveal animation
 * with configurable speed and punctuation delays. Supports both instant display mode
 * and smooth time-based animation driven by delta time.
 *
 * Uses exponential character reveal to handle multiple characters per frame when
 * needed, ensuring consistent animation speed regardless of frame rate.
 *
 * @example
 * ```typescript
 * // Standard typewriter effect (30 characters per second)
 * const effect = new TypewriterEffect({ charsPerSecond: 30, punctuationDelay: 200 });
 *
 * // Instant display (no animation)
 * const instantEffect = new TypewriterEffect({ charsPerSecond: Infinity });
 *
 * // Apply to a text element
 * effectManager.applyEffect(textElement, effect);
 * ```
 */
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

    /**
     * Creates a new TypewriterEffect with configurable animation speed.
     *
     * @param config - Configuration object for the effect
     * @param config.charsPerSecond - Number of characters to reveal per second (default: 30, use Infinity for instant display, 0 is normalized to Infinity)
     * @param config.punctuationDelay - Additional delay in milliseconds when punctuation is encountered (default: 0)
     * @throws Error if charsPerSecond is NaN, negative, or an invalid non-finite value
     */
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


    /**
     * Initializes the typewriter effect when applied to a target.
     *
     * Retrieves the full text content from the target, resets internal state,
     * and either displays the full text immediately (instant mode) or starts
     * with blank text (animation mode).
     *
     * @param target - The effect target containing textContent property to animate
     * @param _context - Game context (unused)
     * @param _logger - Logger instance (unused)
     */
    onStart(target: IEffectTarget, _context: TypedGameContext<unknown>, _logger: ILogger): void {
        // Use the IEffectTarget interface, not getRaw()
        const fullText = target.getProperty<string>('textContent');

        // Check if the property exists on the target
        if (typeof fullText === 'undefined') {
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
     * Updates the typewriter animation each frame based on elapsed time.
     *
     * Accumulates delta time and reveals characters when enough time has elapsed.
     * Handles multiple characters per frame when necessary to maintain consistent
     * animation speed. Applies additional delays for punctuation characters.
     *
     * Skipped entirely in instant mode (Infinity charsPerSecond).
     *
     * @param target - The effect target to update textContent on
     * @param _context - Game context (unused)
     * @param deltaTime - Time elapsed since last frame in seconds
     * @param _logger - Logger instance (unused)
     */
    onUpdate(target: IEffectTarget, _context: TypedGameContext<unknown>, deltaTime: number, _logger: ILogger): void {
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

    /**
     * Completes the typewriter effect when stopped early.
     *
     * Instantly displays the full text content and marks the effect as complete.
     * This allows for skip functionality where users can instantly reveal all text.
     *
     * @param target - The effect target to update textContent on
     * @param _context - Game context (unused)
     * @param _logger - Logger instance (unused)
     */
    onStop(target: IEffectTarget, _context: TypedGameContext<unknown>, _logger: ILogger): void {
        // When stopped, instantly complete the text
        target.setProperty('textContent', this.fullText);
        // Mark as complete
        this.charIndex = this.fullText.length;
    }

    /**
     * Checks if a character is punctuation that should trigger a delay.
     *
     * @param char - Single character to test
     * @returns True if character is punctuation (. ! ? , ; :), false otherwise
     */
    private isPunctuation(char: string): boolean {
        return /[.!?,;:]/.test(char);
    }
}