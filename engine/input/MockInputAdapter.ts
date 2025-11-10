/**
 * MockInputAdapter - Mock input adapter for testing
 *
 * Provides a testing implementation that allows simulating input events.
 */

import { BaseInputAdapter } from './BaseInputAdapter';
import type { InputAdapterType, InputAttachOptions, InputCapabilities } from '@engine/interfaces';
import type { IRenderContainer } from '@engine/interfaces';
import type { EngineInputEvent } from '../core/InputEvents';

/**
 * MockInputAdapter - Testing implementation
 *
 * Allows tests to simulate input events without real hardware.
 */
export class MockInputAdapter extends BaseInputAdapter {
    getType(): InputAdapterType {
        return 'mock';
    }

    attach(container: IRenderContainer, options?: InputAttachOptions): boolean {
        this.attached = true;
        return true;
    }

    detach(): void {
        this.attached = false;
    }

    getCapabilities(): InputCapabilities {
        return {
            keyboard: true,
            mouse: true,
            touch: false,
            gamepad: false
        };
    }

    /**
     * Simulate input event (for testing)
     */
    simulateEvent(event: EngineInputEvent): void {
        this.emitEvent(event);
    }
}
