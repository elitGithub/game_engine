// engine/core/EventBus.ts
import type {EventMap, ListenerMap} from '@engine/types';
import {ILogger} from "@engine/interfaces";

export class EventBus {
    private listeners: ListenerMap;

    constructor(private logger: ILogger) {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
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
     * Unsubscribe from an event
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
     * Emit an event to all subscribers
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
