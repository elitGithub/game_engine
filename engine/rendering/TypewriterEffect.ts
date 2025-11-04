/**
 * TypewriterEffect - Handles animated text reveal
 */
import type { TypewriterConfig } from '@engine/types';

export class TypewriterEffect {
    private config: Required<TypewriterConfig>;
    public isTyping: boolean;
    public isSkipping: boolean;
    private currentAnimation: number | null;
    private skipKeyPressed: boolean;
    private handleKeyDown: (e: KeyboardEvent) => void;
    private handleKeyUp: (e: KeyboardEvent) => void;

    constructor(config: TypewriterConfig = {}) {
        this.config = {
            charsPerSecond: config.charsPerSecond || 30,
            punctuationDelay: config.punctuationDelay || 200,
            skipKey: config.skipKey || ' ',
            skipMultiplier: config.skipMultiplier || 10
        };

        this.isTyping = false;
        this.isSkipping = false;
        this.currentAnimation = null;
        this.skipKeyPressed = false;

        // Bind key handlers
        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === this.config.skipKey && this.isTyping) {
                this.isSkipping = true;
                this.skipKeyPressed = true;
            }
        };

        this.handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === this.config.skipKey) {
                this.isSkipping = false;
                this.skipKeyPressed = false;
            }
        };
    }

    /**
     * Start listening for skip input
     */
    enableSkip(): void {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    /**
     * Stop listening for skip input
     */
    disableSkip(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }

    /**
     * Animate text reveal
     */
    async animate(
        element: HTMLElement, 
        text: string, 
        options: Partial<TypewriterConfig> = {}
    ): Promise<void> {
        // Stop any existing animation
        this.stop();

        const speed = options.charsPerSecond || this.config.charsPerSecond;
        const skipMultiplier = options.skipMultiplier || this.config.skipMultiplier;
        
        this.isTyping = true;
        element.textContent = '';

        return new Promise((resolve) => {
            let charIndex = 0;
            
            const typeNextChar = () => {
                if (!this.isTyping || charIndex >= text.length) {
                    this.isTyping = false;
                    this.isSkipping = false;
                    resolve();
                    return;
                }

                // Add next character
                element.textContent += text[charIndex];
                const currentChar = text[charIndex];
                charIndex++;

                // Calculate delay
                const baseDelay = 1000 / speed;
                let delay = this.isSkipping ? baseDelay / skipMultiplier : baseDelay;

                // Pause on punctuation (unless skipping)
                if (!this.isSkipping && this.isPunctuation(currentChar)) {
                    delay += this.config.punctuationDelay;
                }

                this.currentAnimation = window.setTimeout(typeNextChar, delay);
            };

            typeNextChar();
        });
    }

    /**
     * Instantly complete current animation
     */
    complete(element: HTMLElement | null, fullText: string): void {
        this.stop();
        if (element) {
            element.textContent = fullText;
        }
    }

    /**
     * Stop current animation
     */
    stop(): void {
        this.isTyping = false;
        this.isSkipping = false;
        if (this.currentAnimation !== null) {
            clearTimeout(this.currentAnimation);
            this.currentAnimation = null;
        }
    }

    /**
     * Check if character is punctuation
     */
    private isPunctuation(char: string): boolean {
        return /[.!?,;:]/.test(char);
    }

    /**
     * Clean up
     */
    dispose(): void {
        this.stop();
        this.disableSkip();
    }
}
