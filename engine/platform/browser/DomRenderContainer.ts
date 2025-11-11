/**
 * DOM Container Implementation
 */

import type { IDomRenderContainer } from '@engine/interfaces/IRenderContainer';
import {IAnimationProvider} from "@engine/interfaces";

export class DomRenderContainer implements IDomRenderContainer {
    constructor(private element: HTMLElement, private animationProvider: IAnimationProvider | null = null) {}

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
        return this.animationProvider?.getDevicePixelRatio() || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = this.animationProvider?.requestAnimationFrame(callback);
        return () => id ? this.animationProvider?.cancelAnimationFrame(id) : null;
    }
}
