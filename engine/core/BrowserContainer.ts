// engine/core/BrowserContainer.ts

import type { PlatformContainer } from './PlatformContainer';

/**
 * BrowserContainer - Browser/DOM implementation
 */
export class BrowserContainer implements PlatformContainer {
    constructor(private element: HTMLElement) {}

    getDomElement(): HTMLElement {
        return this.element;
    }

    getCanvasElement(): HTMLCanvasElement | undefined {
        return this.element instanceof HTMLCanvasElement
            ? this.element
            : undefined;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.element.clientWidth,
            height: this.element.clientHeight
        };
    }
}
