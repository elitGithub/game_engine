// engine/tests/InputComboTracker.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InputComboTracker } from '@engine/input/InputComboTracker';
import { EventBus } from '@engine/core/EventBus';
import type { ITimerProvider } from '@engine/interfaces/ITimerProvider';
import {ILogger} from "@engine/interfaces";

vi.mock('@engine/core/EventBus');
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
describe('InputComboTracker', () => {
    let tracker: InputComboTracker;
    let mockEventBus: EventBus;
    let mockTimerProvider: ITimerProvider;

    beforeEach(() => {
        vi.useFakeTimers();
        mockEventBus = new EventBus(mockLogger);
        vi.spyOn(mockEventBus, 'emit');

        // Mock timer provider using vitest fake timers
        mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

        tracker = new InputComboTracker(mockEventBus, 5); // Use a small buffer size for testing
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should add to buffer and respect size limit', () => {
        tracker.addToBuffer('a', mockTimerProvider.now());
        tracker.addToBuffer('b', mockTimerProvider.now());
        tracker.addToBuffer('c', mockTimerProvider.now());
        tracker.addToBuffer('d', mockTimerProvider.now());
        tracker.addToBuffer('e', mockTimerProvider.now());
        expect(tracker.getInputBuffer()).toEqual(['a', 'b', 'c', 'd', 'e']);

        tracker.addToBuffer('f', mockTimerProvider.now());
        expect(tracker.getInputBuffer()).toEqual(['b', 'c', 'd', 'e', 'f']); // 'a' is pushed out
    });

    it('should detect a correct combo', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a', mockTimerProvider.now());
        vi.advanceTimersByTime(100);
        tracker.addToBuffer('b', mockTimerProvider.now());

        tracker.checkCombos();
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'test' });
    });

    it('should not detect an incorrect combo', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a', mockTimerProvider.now());
        vi.advanceTimersByTime(100);
        tracker.addToBuffer('c', mockTimerProvider.now());

        tracker.checkCombos();
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should not detect a combo outside the time window', () => {
        tracker.registerCombo('test', ['a', 'b'], 1000);

        tracker.addToBuffer('a', mockTimerProvider.now());
        vi.advanceTimersByTime(1001); // Exceed time window
        tracker.addToBuffer('b', mockTimerProvider.now());

        tracker.checkCombos();
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should detect a combo at the end of the buffer', () => {
        tracker.registerCombo('test', ['c', 'd'], 1000);

        tracker.addToBuffer('a', mockTimerProvider.now());
        tracker.addToBuffer('b', mockTimerProvider.now());
        tracker.addToBuffer('c', mockTimerProvider.now());
        tracker.addToBuffer('d', mockTimerProvider.now());

        tracker.checkCombos();
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'test' });
    });

    it('should clear the buffer', () => {
        tracker.addToBuffer('a', mockTimerProvider.now());
        tracker.clearBuffer();
        expect(tracker.getInputBuffer()).toEqual([]);
    });

    it('should detect combo even when checkCombos is called after time window elapsed', () => {
        // This test verifies the fix for the time window logic bug.
        // The combo should check the duration between first and last key,
        // NOT the time from each key to "now".
        tracker.registerCombo('test', ['a', 'b'], 1000);

        const startTime = mockTimerProvider.now();
        tracker.addToBuffer('a', startTime);
        vi.advanceTimersByTime(500); // 500ms later
        tracker.addToBuffer('b', mockTimerProvider.now());

        // Advance time way past the time window (2 seconds after first input)
        vi.advanceTimersByTime(1500);

        // Even though we're now 2000ms after the first key press,
        // the combo should still be detected because the sequence
        // duration (b.timestamp - a.timestamp = 500ms) is within the 1000ms window
        tracker.checkCombos();
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'test' });
    });

    it('should NOT detect combo when sequence duration exceeds time window', () => {
        // This ensures the fix correctly validates sequence duration
        tracker.registerCombo('test', ['a', 'b'], 500);

        const startTime = mockTimerProvider.now();
        tracker.addToBuffer('a', startTime);
        vi.advanceTimersByTime(600); // 600ms later (exceeds 500ms window)
        tracker.addToBuffer('b', mockTimerProvider.now());

        // Even if checkCombos is called immediately, the combo should fail
        // because the sequence duration (600ms) exceeds the window (500ms)
        tracker.checkCombos();
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
});