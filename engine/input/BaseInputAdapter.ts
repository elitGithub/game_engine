/**
 * BaseInputAdapter - Base class for input adapters
 *
 * Provides common functionality for all input adapter implementations.
 */

import type { IInputAdapter, InputAdapterType, InputAttachOptions, InputEventHandler } from '@engine/interfaces';
import type { IRenderContainer } from '@engine/interfaces';
import type { EngineInputEvent } from '@engine/types/InputEvents';

/**
 * BaseInputAdapter - Abstract base class for input adapters
 *
 * Provides common event handling and state management logic.
 * Concrete adapters extend this and implement platform-specific attachment logic.
 */
export abstract class BaseInputAdapter implements IInputAdapter {
    protected eventHandler: InputEventHandler | null = null;
    protected attached: boolean = false;
    protected enabled: boolean = true;

    abstract getType(): InputAdapterType;
    abstract attach(container?: IRenderContainer, options?: InputAttachOptions): boolean;
    abstract detach(): void;

    onEvent(handler: InputEventHandler): void {
        this.eventHandler = handler;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isAttached(): boolean {
        return this.attached;
    }

    /**
     * Helper to emit events (only if enabled and handler exists)
     */
    protected emitEvent(event: EngineInputEvent): void {
        if (this.enabled && this.eventHandler) {
            this.eventHandler(event);
        }
    }
}
