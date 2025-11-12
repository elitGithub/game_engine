// engine/core/NativeContainer.ts

import type { PlatformContainer } from './PlatformContainer';

/**
 * NativeContainer - Mobile/native implementation example
 */
export class NativeContainer implements PlatformContainer {
    constructor(private view: unknown) {}

    getNativeView(): unknown {
        return this.view;
    }

    getDimensions(): { width: number; height: number } {
        // Platform-specific dimension retrieval
        // Type assertion required since view is platform-specific
        const view = this.view as { width?: number; height?: number };
        return {
            width: view.width || 0,
            height: view.height || 0
        };
    }
}
