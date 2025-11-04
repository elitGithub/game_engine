export type EventCallback = (data: any) => void;

export class EventBus {
    private listeners: Map<string, EventCallback[]>;

    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     */
    on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     */
    off(event: string, callback: EventCallback): void {
        if (!this.listeners.has(event)) return;
        
        const callbacks = this.listeners.get(event)!;
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit(event: string, data: any = {}): void {
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

// Export a singleton instance
export const eventBus = new EventBus();
