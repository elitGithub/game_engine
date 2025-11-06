// engine/core/EventBus.ts
import type { EventMap } from '@engine/types';

export type EventCallback = (data: any) => void;

export class EventBus {
    private listeners: Map<string, EventCallback[]>;

    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     */
    on<K extends keyof EventMap>(
        event: K,
        // CORRECTED: Removed the stray underscore before "=>"
        callback: (data: EventMap[K]) => void
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback as EventCallback);

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
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event)!;
        const index = callbacks.indexOf(callback as EventCallback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event)!;
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for '${event}':`, error);
            }
        });
    }

    /**
     * Clear all listeners
     */
    clear(): void {
        this.listeners.clear();
    }
}
