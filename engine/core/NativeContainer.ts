// engine/core/NativeContainer.ts

import type { PlatformContainer } from './PlatformContainer';

/**
 * NativeContainer - Mobile/native implementation example
 */
export class NativeContainer implements PlatformContainer {
    constructor(private view: any) {}

    getNativeView(): any {
        return this.view;
    }

    getDimensions(): { width: number; height: number } {
        // Platform-specific dimension retrieval
        return {
            width: this.view.width || 0,
            height: this.view.height || 0
        };
    }
}
