/**
 * TextRenderer - Text rendering with styling, animation, and speakers
 */
import type { RenderOptions, TypewriterConfig } from '@types/index';
import { BaseRenderer } from './BaseRenderer';
import { TypewriterEffect } from './TypewriterEffect';
import { TextStyle, StylePresets } from './TextStyle';
import { SpeakerRegistry, Speaker } from './Speaker';

export class TextRenderer extends BaseRenderer {
    protected config: {
        enableTypewriter: boolean;
        typewriterSpeed: number;
        autoScroll: boolean;
        defaultStyle: TextStyle;
    };
    protected contentContainer: HTMLElement | null;
    protected typewriter: TypewriterEffect | null;
    public speakerRegistry: SpeakerRegistry;
    protected styles: Map<string, TextStyle>;
    protected currentSpeaker: Speaker | null;
    public isAnimating: boolean;

    constructor(
        containerElement: HTMLElement, 
        config: Partial<{
            enableTypewriter: boolean;
            typewriterSpeed: number;
            autoScroll: boolean;
            defaultStyle: TextStyle;
        }> = {}
    ) {
        super(containerElement);

        this.config = {
            enableTypewriter: config.enableTypewriter !== false,
            typewriterSpeed: config.typewriterSpeed || 30,
            autoScroll: config.autoScroll !== false,
            defaultStyle: config.defaultStyle || StylePresets.narrative
        };

        this.contentContainer = null;
        
        this.typewriter = this.config.enableTypewriter 
            ? new TypewriterEffect({
                charsPerSecond: this.config.typewriterSpeed,
                skipKey: ' '
            })
            : null;

        this.speakerRegistry = new SpeakerRegistry();
        this.styles = new Map();
        this.registerDefaultStyles();

        this.currentSpeaker = null;
        this.isAnimating = false;
    }

    async initialize(): Promise<void> {
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'text-renderer-content';
        this.container.appendChild(this.contentContainer);

        if (this.typewriter) {
            this.typewriter.enableSkip();
        }

        await super.initialize();
    }

    protected registerDefaultStyles(): void {
        this.styles.set('narrative', StylePresets.narrative);
        this.styles.set('dialogue', StylePresets.dialogue);
        this.styles.set('system', StylePresets.system);
        this.styles.set('emphasis', StylePresets.emphasis);
        this.styles.set('choice', StylePresets.choice);
        this.styles.set('bubble', StylePresets.bottomBubble);
    }

    registerStyle(name: string, style: TextStyle): void {
        this.styles.set(name, style);
    }

    getStyle(name: string): TextStyle {
        return this.styles.get(name) || this.config.defaultStyle;
    }

    clear(): void {
        if (this.typewriter) {
            this.typewriter.stop();
        }
        if (this.contentContainer) {
            this.contentContainer.innerHTML = '';
        }
    }

    async render(content: string | { text: string }, options: RenderOptions = {}): Promise<HTMLElement> {
        const text = typeof content === 'string' ? content : content.text;
        const styleId = typeof options.style === 'string' ? options.style : 'narrative';
        const animate = options.animate !== false && this.config.enableTypewriter;
        const speaker = options.speaker || null;

        const textElement = document.createElement('div');
        textElement.className = `text-block text-${styleId}`;

        const style = typeof options.style === 'object' 
            ? new TextStyle(options.style)
            : this.getStyle(styleId);
        style.apply(textElement);

        if (speaker && this.contentContainer) {
            const speakerObj = this.speakerRegistry.get(speaker);
            const dialogueContainer = this.createDialogueContainer(speakerObj, textElement);
            this.contentContainer.appendChild(dialogueContainer);
        } else if (this.contentContainer) {
            this.contentContainer.appendChild(textElement);
        }

        if (animate && this.typewriter) {
            this.isAnimating = true;
            await this.typewriter.animate(textElement, text, {
                charsPerSecond: options.speed || this.config.typewriterSpeed
            });
            this.isAnimating = false;
        } else {
            textElement.textContent = text;
        }

        if (this.config.autoScroll) {
            this.scrollToBottom();
        }

        return textElement;
    }

    async renderDialogue(speakerId: string, text: string, options: RenderOptions = {}): Promise<HTMLElement> {
        return this.render(text, {
            ...options,
            speaker: speakerId,
            style: options.style || 'dialogue'
        });
    }

    protected createDialogueContainer(speaker: Speaker, textElement: HTMLElement): HTMLElement {
        const container = document.createElement('div');
        container.className = 'dialogue-container';
        container.style.display = 'flex';
        container.style.alignItems = 'flex-start';
        container.style.gap = '0.75rem';
        container.style.margin = '0.5rem 0';

        const portrait = speaker.createPortraitElement();
        if (portrait) {
            container.appendChild(portrait);
        }

        const textWrapper = document.createElement('div');
        textWrapper.className = 'dialogue-text-wrapper';
        textWrapper.style.flex = '1';

        const nameEl = speaker.createNameElement();
        textWrapper.appendChild(nameEl);
        textWrapper.appendChild(textElement);

        container.appendChild(textWrapper);

        return container;
    }

    async renderSequence(lines: Array<{ text: string; options?: RenderOptions }>): Promise<void> {
        for (const line of lines) {
            await this.render(line.text, line.options || {});
        }
    }

    write(text: string, newLine: boolean = true): void {
        if (!this.contentContainer) return;
        
        const textElement = document.createElement('div');
        textElement.textContent = text + (newLine ? '' : '');
        textElement.style.whiteSpace = 'pre-wrap';
        this.contentContainer.appendChild(textElement);
        
        if (this.config.autoScroll) {
            this.scrollToBottom();
        }
    }

    scrollToBottom(): void {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    skipAnimation(): void {
        if (this.typewriter && this.isAnimating) {
            this.typewriter.isSkipping = true;
        }
    }

    async waitForAnimation(): Promise<void> {
        while (this.isAnimating) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    dispose(): void {
        if (this.typewriter) {
            this.typewriter.dispose();
        }
        super.dispose();
    }
}
