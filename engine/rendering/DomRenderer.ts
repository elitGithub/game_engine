import type { IRenderer, RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';
import type { AssetManager } from '@engine/systems/AssetManager';
import { isDomRenderContainer } from '@engine/interfaces';
import { DomRenderContainer } from "@engine/platform/browser/DomRenderContainer";

interface CachedElement {
    el: HTMLElement;
    lastCommand: RenderCommand;
}

export class DomRenderer implements IRenderer {
    // Cache elements by ID to avoid recreation
    private activeElements: Map<string, CachedElement> = new Map();
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
        this.activeElements.forEach(entry => entry.el.remove());
        this.activeElements.clear();
    }

    flush(commands: RenderCommand[]): void {
        if (!this.container) return;

        // 1. Identify which IDs are present in this frame
        const currentFrameIds = new Set<string>();

        // 2. Create or Update elements
        for (const cmd of commands) {
            if (cmd.type === 'clear') {
                this.clear();
                continue;
            }

            currentFrameIds.add(cmd.id);
            this.renderCommand(cmd);
        }

        // 3. Prune elements that are no longer present (Garbage Collection)
        for (const [id, entry] of this.activeElements) {
            if (!currentFrameIds.has(id)) {
                entry.el.remove();
                this.activeElements.delete(id);
            }
        }
    }

    private renderCommand(cmd: RenderCommand): void {
        // Type guard to exclude 'clear' (handled in flush)
        if (cmd.type === 'clear') return;

        let entry = this.activeElements.get(cmd.id);

        // A. Create if missing (or if type changed, though unlikely for same ID)
        if (!entry || entry.lastCommand.type !== cmd.type) {
            // If type changed but ID same, remove old one first
            if (entry) entry.el.remove();

            const newEl = this.createElement(cmd);
            this.container!.appendChild(newEl);

            // For new elements, set all properties without diffing
            this.setInitialProperties(newEl, cmd);

            entry = { el: newEl, lastCommand: cmd };
            this.activeElements.set(cmd.id, entry);
        } else {
            // B. Update properties (Diffing) for existing elements only
            this.updateElement(entry.el, entry.lastCommand, cmd);

            // Update cache reference
            entry.lastCommand = cmd;
        }
    }

    private createElement(cmd: Exclude<RenderCommand, { type: 'clear' }>): HTMLElement {
        let el: HTMLElement;

        switch (cmd.type) {
            case 'image':
            case 'sprite':
                el = document.createElement('img');
                break;
            case 'text':
            case 'rect':
            case 'hotspot':
                el = document.createElement('div');
                break;
        }

        // Set static/initial styles that rarely change
        el.id = cmd.id;
        el.style.position = 'absolute';
        return el;
    }

    private setInitialProperties(el: HTMLElement, cmd: Exclude<RenderCommand, { type: 'clear' }>): void {
        // Set positioning using GPU-accelerated transforms (avoids layout reflow)
        el.style.transform = `translate3d(${cmd.x}px, ${cmd.y}px, 0)`;
        el.style.zIndex = `${cmd.zIndex ?? 0}`;

        // Type-specific properties
        switch (cmd.type) {
            case 'image':
            case 'sprite': {
                const imgEl = el as HTMLImageElement;
                const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
                if (imgAsset) imgEl.src = imgAsset.src;

                imgEl.style.width = cmd.width ? `${cmd.width}px` : 'auto';
                imgEl.style.height = cmd.height ? `${cmd.height}px` : 'auto';

                if (cmd.type === 'image' && cmd.fit) {
                    imgEl.style.objectFit = cmd.fit;
                }
                break;
            }

            case 'text': {
                el.textContent = cmd.text;
                this.applyTextStyle(el, cmd.style);
                break;
            }

            case 'rect': {
                el.style.width = `${cmd.width}px`;
                el.style.height = `${cmd.height}px`;
                el.style.backgroundColor = cmd.fill || 'transparent';
                el.style.border = cmd.stroke ? `1px solid ${cmd.stroke}` : 'none';
                break;
            }

            case 'hotspot': {
                el.style.width = `${cmd.width}px`;
                el.style.height = `${cmd.height}px`;
                el.style.cursor = 'pointer';

                if (cmd.data) {
                    Object.assign(el.dataset, cmd.data);
                }
                break;
            }
        }
    }

    private updateElement(el: HTMLElement, oldCmd: Exclude<RenderCommand, { type: 'clear' }>, newCmd: Exclude<RenderCommand, { type: 'clear' }>): void {
        // 1. Common positioning (Optimization: check if changed)
        // Use GPU-accelerated transforms to avoid layout reflow
        if (oldCmd.x !== newCmd.x || oldCmd.y !== newCmd.y) {
            el.style.transform = `translate3d(${newCmd.x}px, ${newCmd.y}px, 0)`;
        }

        if (oldCmd.zIndex !== newCmd.zIndex) {
            el.style.zIndex = `${newCmd.zIndex ?? 0}`;
        }

        // 2. Type-specific updates
        switch (newCmd.type) {
            case 'image':
            case 'sprite': {
                // Type guard: oldCmd and newCmd have same type (guaranteed by renderCommand logic)
                if (oldCmd.type !== 'image' && oldCmd.type !== 'sprite') return;

                const imgEl = el as HTMLImageElement;
                // Only touch DOM if values changed
                if (oldCmd.type !== newCmd.type || oldCmd.assetId !== newCmd.assetId) {
                    const imgAsset = this.assets.get<HTMLImageElement>(newCmd.assetId);
                    if (imgAsset) imgEl.src = imgAsset.src;
                }

                if (oldCmd.width !== newCmd.width) {
                    imgEl.style.width = newCmd.width ? `${newCmd.width}px` : 'auto';
                }
                if (oldCmd.height !== newCmd.height) {
                    imgEl.style.height = newCmd.height ? `${newCmd.height}px` : 'auto';
                }

                if (newCmd.type === 'image' && oldCmd.type === 'image' && oldCmd.fit !== newCmd.fit) {
                    imgEl.style.objectFit = newCmd.fit || 'fill';
                }
                break;
            }

            case 'text': {
                // Type guard
                if (oldCmd.type !== 'text') return;

                if (oldCmd.text !== newCmd.text) {
                    el.textContent = newCmd.text;
                }
                // Deep style check is expensive, we assumes style object reference changes if content changes
                // or strictly compare keys if necessary. For now, re-applying style is cheaper than removing node.
                this.applyTextStyle(el, newCmd.style);
                break;
            }

            case 'rect': {
                // Type guard
                if (oldCmd.type !== 'rect') return;

                if (oldCmd.width !== newCmd.width) el.style.width = `${newCmd.width}px`;
                if (oldCmd.height !== newCmd.height) el.style.height = `${newCmd.height}px`;

                if (oldCmd.fill !== newCmd.fill) {
                    el.style.backgroundColor = newCmd.fill || 'transparent';
                }
                if (oldCmd.stroke !== newCmd.stroke) {
                    el.style.border = newCmd.stroke ? `1px solid ${newCmd.stroke}` : 'none';
                }
                break;
            }

            case 'hotspot': {
                // Type guard
                if (oldCmd.type !== 'hotspot') return;

                // Always update dimensions
                if (oldCmd.width !== newCmd.width) el.style.width = `${newCmd.width}px`;
                if (oldCmd.height !== newCmd.height) el.style.height = `${newCmd.height}px`;
                el.style.cursor = 'pointer';

                // Data attributes
                if (newCmd.data) {
                    // Naive update: reset dataset. Optimizable if needed.
                    Object.assign(el.dataset, newCmd.data);
                }
                break;
            }
        }
    }

    private applyTextStyle(el: HTMLElement, style: TextStyleData): void {
        // We can optimize this further by diffing specific style props
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