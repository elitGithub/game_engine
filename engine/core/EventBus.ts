// engine/core/EventBus.ts
import type {EventMap, ListenerMap} from '@engine/types';
import {ILogger} from "@engine/interfaces";

export class EventBus {
    private listeners: ListenerMap;

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

// No 'as' cast! Also 100% type-safe.
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event to all subscribers.
     * Errors thrown by event handlers are caught and logged without interrupting other handlers.
     *
     * @template K - The event type from the EventMap
     * @param event - The event name to emit
     * @param data - The data to pass to all event listeners
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        const callbacks = this.listeners[event];
        if (!callbacks) return;

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
               this.logger.error(`Error in event handler for '${event}':`, error);
            }
        });
    }

    /**
     * Clear all listeners
     */
    clear(): void {
        this.listeners = {};
    }
}
