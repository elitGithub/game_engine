import type { IRenderer, RenderCommand, TextStyleData } from '../types/RenderingTypes';
import type { AssetManager } from '@engine/systems/AssetManager.ts';

export class DomRenderer implements IRenderer {
    private elements: Map<string, HTMLElement> = new Map();
    private container!: HTMLElement; // Initialized in init()

    constructor(
        // AssetManager is required to resolve asset IDs
        private assets: AssetManager
    ) {}

    init(container: HTMLElement): void {
        this.container = container;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
    }

    clear(): void {
        this.elements.forEach(el => el.remove());
        this.elements.clear();
    }

    flush(commands: RenderCommand[]): void {
        this.clear();

        // Type-safe helper to get zIndex
        const getZ = (cmd: RenderCommand): number => {
            if (cmd.type === 'clear') return -Infinity;
            return cmd.zIndex || 0;
        }

        // Filter out 'clear' commands to guarantee all other commands have the properties we need
        const renderableCommands = commands.filter(cmd => cmd.type !== 'clear');

        const sortedCommands = renderableCommands.sort((a, b) => getZ(a) - getZ(b));

        for (const cmd of sortedCommands) {
            let el: HTMLElement; // Guaranteed to be one of the types below

            switch (cmd.type) {
                case 'image':
                case 'sprite': {
                    const imgEl = document.createElement('img');
                    const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
                    if (imgAsset) {
                        imgEl.src = imgAsset.src; // This is now safe
                    }
                    imgEl.style.width = cmd.width ? `${cmd.width}px` : 'auto';
                    imgEl.style.height = cmd.height ? `${cmd.height}px` : 'auto';
                    if (cmd.type === 'image' && cmd.fit) {
                        imgEl.style.objectFit = cmd.fit;
                    }
                    el = imgEl;
                    break;
                }

                case 'text': {
                    const textEl = document.createElement('div');
                    textEl.textContent = cmd.text;
                    this.applyTextStyle(textEl, cmd.style);
                    el = textEl;
                    break;
                }

                case 'rect': {
                    const rectEl = document.createElement('div');
                    rectEl.style.width = `${cmd.width}px`;
                    rectEl.style.height = `${cmd.height}px`;
                    if (cmd.fill) rectEl.style.backgroundColor = cmd.fill;
                    if (cmd.stroke) rectEl.style.border = `1px solid ${cmd.stroke}`;
                    el = rectEl;
                    break;
                }

                case 'hotspot': {
                    const spotEl = document.createElement('div');
                    spotEl.dataset.action = cmd.action;
                    spotEl.style.cursor = 'pointer';
                    spotEl.style.width = `${cmd.width}px`;
                    spotEl.style.height = `${cmd.height}px`;
                    el = spotEl;
                    break;
                }
            }

            // All properties below are now safe to access
            // because 'clear' type was filtered out.
            el.id = cmd.id;
            el.style.position = 'absolute';
            el.style.left = `${cmd.x}px`;
            el.style.top = `${cmd.y}px`;
            if (cmd.zIndex) {
                el.style.zIndex = `${cmd.zIndex}`;
            }

            this.elements.set(cmd.id, el);
            this.container.appendChild(el);
        }
    }

    private applyTextStyle(el: HTMLElement, style: TextStyleData): void {
        if (style.font) el.style.font = style.font;
        if (style.color) el.style.color = style.color;
        if (style.align) el.style.textAlign = style.align;
        if (style.bold) el.style.fontWeight = 'bold';
        if (style.italic) el.style.fontStyle = 'italic';
    }

    dispose(): void {
        this.clear();
    }
}