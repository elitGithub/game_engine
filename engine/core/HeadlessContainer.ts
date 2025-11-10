// engine/core/HeadlessContainer.ts

import type { PlatformContainer } from './PlatformContainer';

/**
 * HeadlessContainer - Server/testing implementation
 */
export class HeadlessContainer implements PlatformContainer {
    constructor(private width: number = 800, private height: number = 600) {}

    getDimensions(): { width: number; height: number } {
        return {
            width: this.width,
            height: this.height
        };
    }
}
