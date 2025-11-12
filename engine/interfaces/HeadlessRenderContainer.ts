/**
 * Headless Container Implementation
 */

import type { IHeadlessRenderContainer } from '@engine/interfaces/IRenderContainer';

export class HeadlessRenderContainer implements IHeadlessRenderContainer {
    constructor(
        private width: number = 800,
        private height: number = 600,
        private pixelRatio: number = 1.0
    ) {}

    getType(): 'headless' {
        return 'headless';
    }

    getElement(): null {
        return null;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.width = width;
        this.height = height;
        return true;
    }

    getPixelRatio(): number {
        return this.pixelRatio;
    }
}
