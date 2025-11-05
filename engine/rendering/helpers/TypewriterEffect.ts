/**
 * TypewriterEffect - Handles animated text reveal as a dynamic effect
 */
import type { IDynamicEffect, GameContext } from '@engine/types';

export class TypewriterEffect implements IDynamicEffect {
    private fullText: string = '';
    private currentAnimation: number | null = null;
    private charIndex: number = 0;

    // Configurable (or could be passed via context)
    private charsPerSecond: number = 30;
    private punctuationDelay: number = 200;

    onStart(element: HTMLElement, context: GameContext<any>): void {
        this.fullText = element.textContent || '';
        element.textContent = '';
        this.charIndex = 0;

        this.stop(); // Clear any previous timer
        this.typeNextChar(element);
    }

    private typeNextChar(element: HTMLElement): void {
        if (this.charIndex >= this.fullText.length) {
            this.currentAnimation = null;
            return;
        }

        // Add next character
        const currentChar = this.fullText[this.charIndex];
        element.textContent += currentChar;
        this.charIndex++;

        // Calculate delay
        let delay = 1000 / this.charsPerSecond;
        if (this.isPunctuation(currentChar)) {
            delay += this.punctuationDelay;
        }

        this.currentAnimation = window.setTimeout(() => {
            this.typeNextChar(element);
        }, delay);
    }

    onUpdate(element: HTMLElement, context: GameContext<any>, deltaTime: number): void {
        // No-op, we are using setTimeout for simplicity.
        // A more robust implementation would use deltaTime.
    }

    onStop(element: HTMLElement, context: GameContext<any>): void {
        this.stop();
        if (element) {
            element.textContent = this.fullText;
        }
    }

    private stop(): void {
        if (this.currentAnimation !== null) {
            clearTimeout(this.currentAnimation);
            this.currentAnimation = null;
        }
    }

    private isPunctuation(char: string): boolean {
        return /[.!?,;:]/.test(char);
    }
}