// engine/core/EventBus.ts
import type {EventMap, ListenerMap} from '@engine/types';
import type {ILogger} from "@engine/interfaces";

export class EventBus {
    private listeners: ListenerMap;
    private suppressionEnabled: boolean = false;

    constructor(private logger: ILogger) {
        this.listeners = {};
    }

    /**
     * Subscribe to an event.
     *
     * @template K - The event type from the EventMap
     * @param event - The event name to subscribe to
     * @param callback - The callback function to invoke when the event is emitted
     * @returns A function that can be called to unsubscribe from the event
     */
    on<K extends keyof EventMap>(
        event: K,
        // CORRECTED: Removed the stray underscore before "=>"
        callback: (data: EventMap[K]) => void
    ): () => void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        this.listeners[event]!.push(callback);

        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event.
     *
     * @template K - The event type from the EventMap
     * @param event - The event name to unsubscribe from
     * @param callback - The callback function to remove from the event listeners
     */
    off<K extends keyof EventMap>(
        event: K,
        // CORRECTED: Removed the stray underscore before "=>"
        callback: (data: EventMap[K]) => void
    ): void {
        const callbacks = this.listeners[event];
        if (!callbacks) return;

        // Type-safe callback removal without casting
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Subscribe to an event for a single emission, then automatically unsubscribe.
     * Useful for preventing memory leaks from one-time event handlers.
     *
     * @template K - The event type from the EventMap
     * @param event - The event name to subscribe to
     * @param callback - The callback function to invoke once when the event is emitted
     * @returns A function that can be called to cancel the subscription before it fires
     */
    once<K extends keyof EventMap>(
        event: K,
        callback: (data: EventMap[K]) => void
    ): () => void {
        const wrapper = (data: EventMap[K]) => {
            this.off(event, wrapper);
            callback(data);
        };

        return this.on(event, wrapper);
    }

    /**
     * Emit an event to all subscribers.
     * Errors thrown by event handlers are caught and logged without interrupting other handlers.
     *
     * Note: Array cloning is necessary for EventBus because:
     * - Listener execution order MUST be preserved (registration order)
     * - Listeners can unsubscribe OTHER listeners during emit
     * - Unlike EffectManager, listener order is semantically important
     *
     * @template K - The event type from the EventMap
     * @param event - The event name to emit
     * @param data - The data to pass to all event listeners
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        // Silently return if events are suppressed (used by SaveManager during load transactions)
        if (this.suppressionEnabled) return;

        const callbacks = this.listeners[event];
        if (!callbacks) return;

        // Clone array before iteration to prevent issues when listeners
        // unsubscribe during emit (which would mutate the array mid-iteration)
        // This ensures all registered listeners execute in order
        [...callbacks].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
               this.logger.error(`Error in event handler for '${event}':`, error);
            }
        });
    }

    /**
     * Suppress all event emissions. Events will be silently dropped until resumeEvents() is called.
     * Used by SaveManager to prevent "phantom events" during load transactions.
     */
    suppressEvents(): void {
        this.suppressionEnabled = true;
    }

    /**
     * Resume normal event emission after suppressEvents() was called.
     */
    resumeEvents(): void {
        this.suppressionEnabled = false;
    }

    /**
     * Check if event suppression is currently enabled.
     * @returns true if events are being suppressed, false otherwise
     */
    isSuppressed(): boolean {
        return this.suppressionEnabled;
    }

    /**
     * Clear all listeners
     */
    clear(): void {
        this.listeners = {};
    }
}
