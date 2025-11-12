// engine/rendering/DomRenderer.ts

import type { IRenderer, RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';
import type { AssetManager } from '@engine/systems/AssetManager.ts';
import { isDomRenderContainer } from '@engine/interfaces';
import {DomRenderContainer} from "@engine/platform/browser/DomRenderContainer";

/**
 * DomRenderer - DOM-based renderer implementation
 * DECOUPLED: Applies generic data-* attributes without interpreting them
 *
 * Requires IDomRenderContainer - use with DomRenderContainer from platform adapter
 */
export class DomRenderer implements IRenderer {
    private elements: Map<string, HTMLElement> = new Map();
    private container: HTMLElement | null = null;

    constructor(private assets: AssetManager) {}

    init(container: DomRenderContainer): void {
        if (!isDomRenderContainer(container)) {
            throw new Error('[DomRenderer] Requires IDomRenderContainer (DOM platform)');
        }

        this.container = container.getElement();
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
    }

    clear(): void {
        this.elements.forEach(el => el.remove());
        this.elements.clear();
    }

    flush(commands: RenderCommand[]): void {
        if (!this.container) return;
        this.clear();

        const getZ = (cmd: RenderCommand): number => {
            if (cmd.type === 'clear') return -Infinity;
            return cmd.zIndex || 0;
        }

        const renderableCommands = commands.filter(cmd => cmd.type !== 'clear');
        const sortedCommands = renderableCommands.sort((a, b) => getZ(a) - getZ(b));

        for (const cmd of sortedCommands) {
            let el: HTMLElement;

            switch (cmd.type) {
                case 'image':
                case 'sprite': {
                    const imgEl = document.createElement('img');
                    const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
                    if (imgAsset) {
                        imgEl.src = imgAsset.src;
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

                    // Apply all data-* attributes from the data object
                    if (cmd.data) {
                        for (const [key, value] of Object.entries(cmd.data)) {
                            spotEl.dataset[key] = String(value);
                        }
                    }

                    spotEl.style.cursor = 'pointer';
                    spotEl.style.width = `${cmd.width}px`;
                    spotEl.style.height = `${cmd.height}px`;
                    el = spotEl;
                    break;
                }
            }

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