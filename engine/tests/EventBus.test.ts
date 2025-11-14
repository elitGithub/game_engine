import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@engine/core/EventBus';
import type { EventMap } from '@engine/types';
import { createMockLogger } from './helpers/loggerMocks';

// Extend the EventMap for testing purposes
declare module '@engine/types' {
    interface EventMap {
        'test.event': { value: number };
        'other.event': { name: string };
    }
}

const mockLogger = createMockLogger();


describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus(mockLogger);
    });

    it('should subscribe to an event and receive data', () => {
        const listener = vi.fn((_data: EventMap['test.event']) => {});
        eventBus.on('test.event', listener);

        eventBus.emit('test.event', { value: 123 });

        expect(listener).toHaveBeenCalledOnce();
        expect(listener).toHaveBeenCalledWith({ value: 123 });
    });

    it('should allow multiple subscribers', () => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();

        eventBus.on('test.event', listener1);
        eventBus.on('test.event', listener2);

        eventBus.emit('test.event', { value: 456 });

        expect(listener1).toHaveBeenCalledOnce();
        expect(listener2).toHaveBeenCalledOnce();
        expect(listener1).toHaveBeenCalledWith({ value: 456 });
    });

    it('should not notify listeners of other events', () => {
        const listener = vi.fn();
        eventBus.on('test.event', listener);

        eventBus.emit('other.event', { name: 'test' });

        expect(listener).not.toHaveBeenCalled();
    });

    it('should unsubscribe from an event', () => {
        const listener = vi.fn();
        eventBus.on('test.event', listener);

        eventBus.emit('test.event', { value: 1 });
        expect(listener).toHaveBeenCalledTimes(1);

        eventBus.off('test.event', listener);

        eventBus.emit('test.event', { value: 2 });
        expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should return an unsubscribe function from .on()', () => {
        const listener = vi.fn();
        const unsubscribe = eventBus.on('test.event', listener);

        eventBus.emit('test.event', { value: 1 });
        expect(listener).toHaveBeenCalledTimes(1);

        unsubscribe();

        eventBus.emit('test.event', { value: 2 });
        expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should clear all listeners', () => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        eventBus.on('test.event', listener1);
        eventBus.on('other.event', listener2);

        eventBus.clear();

        eventBus.emit('test.event', { value: 1 });
        eventBus.emit('other.event', { name: 'test' });

        expect(listener1).not.toHaveBeenCalled();
        expect(listener2).not.toHaveBeenCalled();
    });

    it('should safely handle unsubscribe during emit', () => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        const listener3 = vi.fn();

        eventBus.on('test.event', listener1);
        const unsubscribe2 = eventBus.on('test.event', listener2);
        eventBus.on('test.event', () => {
            // Unsubscribe listener2 during emit
            unsubscribe2();
            listener3();
        });

        eventBus.emit('test.event', { value: 1 });

        // All listeners should execute despite mid-iteration unsubscribe
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
        expect(listener3).toHaveBeenCalledTimes(1);
    });

    it('should handle self-unsubscribe during emit', () => {
        const listener1 = vi.fn();
        const listener2 = vi.fn();
        let unsubscribeSelf: (() => void) | null = null;

        eventBus.on('test.event', listener1);
        unsubscribeSelf = eventBus.on('test.event', () => {
            // Listener unsubscribes itself during execution
            unsubscribeSelf!();
            listener2();
        });

        // First emit: both listeners execute, second unsubscribes itself
        eventBus.emit('test.event', { value: 1 });
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);

        // Second emit: only listener1 executes (second already unsubscribed)
        eventBus.emit('test.event', { value: 2 });
        expect(listener1).toHaveBeenCalledTimes(2);
        expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple unsubscribes during emit', () => {
        const executionOrder: number[] = [];

        const unsub1 = eventBus.on('test.event', () => executionOrder.push(1));
        const unsub2 = eventBus.on('test.event', () => executionOrder.push(2));
        const unsub3 = eventBus.on('test.event', () => executionOrder.push(3));
        eventBus.on('test.event', () => {
            // Unsubscribe all previous listeners during emit
            unsub1();
            unsub2();
            unsub3();
            executionOrder.push(4);
        });
        eventBus.on('test.event', () => executionOrder.push(5));

        eventBus.emit('test.event', { value: 1 });

        // All 5 listeners should execute in order despite unsubscriptions
        expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
    });
});