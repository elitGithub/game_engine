/**
 * Headless Container Implementation
 */

import type {IHeadlessRenderContainer} from '@game-engine/core/interfaces/IRenderContainer';

const DEFAULT_HEADLESS_WIDTH = 800;
const DEFAULT_HEADLESS_HEIGHT = 600;
const DEFAULT_HEADLESS_PIXEL_RATIO = 1.0;

export class HeadlessRenderContainer implements IHeadlessRenderContainer {
    constructor(
        private width: number = DEFAULT_HEADLESS_WIDTH,
        private height: number = DEFAULT_HEADLESS_HEIGHT,
        private pixelRatio: number = DEFAULT_HEADLESS_PIXEL_RATIO
    ) {
    }

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
