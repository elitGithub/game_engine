import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@engine/core/EventBus';
import type { EventMap } from '@engine/types';
import { ILogger } from "@engine/interfaces";

// Extend the EventMap for testing purposes
declare module '@engine/types' {
    interface EventMap {
        'test.event': { value: number };
        'other.event': { name: string };
    }
}

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};


describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus(mockLogger);
    });

    it('should subscribe to an event and receive data', () => {
        const listener = vi.fn((data: EventMap['test.event']) => {});
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
});