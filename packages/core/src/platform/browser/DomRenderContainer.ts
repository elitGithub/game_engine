/**
 * DOM Container Implementation
 */


import {IAnimationProvider, IDomRenderContainer} from "@game-engine/core/interfaces";

export class DomRenderContainer implements IDomRenderContainer {
    private pendingFrameId?: number;

    constructor(private readonly element: HTMLElement, private animationProvider: IAnimationProvider | null = null) {}

    getType(): 'dom' {
        return 'dom';
    }

    getElement(): HTMLElement {
        return this.element;
    }

    createElement(tagName: string): HTMLElement {
        return document.createElement(tagName);
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.element.clientWidth,
            height: this.element.clientHeight
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        return true;
    }

    getPixelRatio(): number {
        return this.animationProvider?.getDevicePixelRatio() || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = this.animationProvider?.requestAnimationFrame(callback);
        this.pendingFrameId = id;
        return () => {
            if (id) {
                this.animationProvider?.cancelAnimationFrame(id);
                this.pendingFrameId = undefined;
            }
        };
    }

    dispose(): void {
        if (this.pendingFrameId) {
            this.animationProvider?.cancelAnimationFrame(this.pendingFrameId);
            this.pendingFrameId = undefined;
        }
    }
}
