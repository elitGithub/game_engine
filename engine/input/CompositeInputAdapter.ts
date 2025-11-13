/**
 * CompositeInputAdapter - Composite pattern for input adapters
 *
 * Combines multiple input adapters into a single adapter.
 * Useful for supporting multiple input methods simultaneously.
 */

import { BaseInputAdapter } from '@engine/input/BaseInputAdapter';
import type { IInputAdapter, InputAdapterType, InputAttachOptions, InputCapabilities } from '@engine/interfaces';
import type { IRenderContainer } from '@engine/interfaces';

/**
 * CompositeInputAdapter - Combines multiple input adapters
 *
 * Example: Combine keyboard, mouse, and gamepad adapters into one
 */
export class CompositeInputAdapter extends BaseInputAdapter {
    private adapters: IInputAdapter[] = [];

    constructor(...adapters: IInputAdapter[]) {
        super();
        this.adapters = adapters;

        // Forward events from all child adapters
        adapters.forEach(adapter => {
            adapter.onEvent((event) => this.emitEvent(event));
        });
    }

    getType(): InputAdapterType {
        return 'composite' as InputAdapterType;
    }

    attach(container: IRenderContainer, options?: InputAttachOptions): boolean {
        let anyAttached = false;
        this.adapters.forEach(adapter => {
            if (adapter.attach(container, options)) {
                anyAttached = true;
            }
        });
        this.attached = anyAttached;
        return anyAttached;
    }

    detach(): void {
        this.adapters.forEach(adapter => adapter.detach());
        this.attached = false;
    }

    setEnabled(enabled: boolean): void {
        super.setEnabled(enabled);
        this.adapters.forEach(adapter => adapter.setEnabled?.(enabled));
    }

    getCapabilities(): InputCapabilities {
        // Merge capabilities from all adapters
        const merged: InputCapabilities = {
            keyboard: false,
            mouse: false,
            touch: false,
            gamepad: false
        };

        this.adapters.forEach(adapter => {
            const caps = adapter.getCapabilities?.();
            if (caps) {
                merged.keyboard = merged.keyboard || caps.keyboard;
                merged.mouse = merged.mouse || caps.mouse;
                merged.touch = merged.touch || caps.touch;
                merged.gamepad = merged.gamepad || caps.gamepad;
                if (caps.maxTouchPoints) {
                    merged.maxTouchPoints = Math.max(
                        merged.maxTouchPoints || 0,
                        caps.maxTouchPoints
                    );
                }
            }
        });

        return merged;
    }
}
