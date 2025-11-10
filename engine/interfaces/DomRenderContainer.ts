/**
 * DOM Container Implementation
 */

import type { IDomRenderContainer } from './IRenderContainer';

export class DomRenderContainer implements IDomRenderContainer {
    constructor(private element: HTMLElement) {}

    getType(): 'dom' {
        return 'dom';
    }

    getElement(): HTMLElement {
        return this.element;
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
        return window.devicePixelRatio || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = window.requestAnimationFrame(callback);
        return () => window.cancelAnimationFrame(id);
    }
}
