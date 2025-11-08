// engine/tests/InputComboTracker.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InputComboTracker } from '@engine/input/InputComboTracker';
import { EventBus } from '@engine/core/EventBus';

vi.mock('@engine/core/EventBus');

describe('InputComboTracker', () => {
    let tracker: InputComboTracker;
    let mockEventBus: EventBus;

    beforeEach(() => {
        vi.useFakeTimers();
        mockEventBus = new EventBus();
        vi.spyOn(mockEventBus, 'emit');
        tracker = new InputComboTracker(mockEventBus, 5); // Use a small buffer size for testing
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should add to buffer and respect size limit', () => {
        tracker.addToBuffer('a');
        tracker.addToBuffer('b');
        tracker.addToBuffer('c');
        tracker.addToBuffer('d');
        tracker.addToBuffer('e');
        expect(tracker.getInputBuffer()).toEqual(['a', 'b', 'c', 'd', 'e']);

        tracker.addToBuffer('f');
        expect(tracker.getInputBuffer()).toEqual(['b', 'c', 'd', 'e', 'f']); // 'a' is pushed out
    });

    it('should detect a correct combo', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a');
        vi.advanceTimersByTime(100);
        tracker.addToBuffer('b');

        tracker.checkCombos();
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'test' });
    });

    it('should not detect an incorrect combo', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a');
        vi.advanceTimersByTime(100);
        tracker.addToBuffer('c');

        tracker.checkCombos();
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should not detect a combo outside the time window', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a');
        vi.advanceTimersByTime(1001); // Exceed time window
        tracker.addToBuffer('b');

        tracker.checkCombos();
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should detect a combo at the end of the buffer', () => {
        tracker.registerCombo('test', ['c', 'd'], 1000);

        tracker.addToBuffer('a');
        tracker.addToBuffer('b');
        tracker.addToBuffer('c');
        tracker.addToBuffer('d');

        tracker.checkCombos();
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'test' });
    });

    it('should clear the buffer', () => {
        tracker.addToBuffer('a');
        tracker.clearBuffer();
        expect(tracker.getInputBuffer()).toEqual([]);
    });
});