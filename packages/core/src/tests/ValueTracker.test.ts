// engine/utils/ValueTracker.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {ValueTracker} from "@game-engine/core/utils/ValueTracker";

describe('ValueTracker', () => {
    let tracker: ValueTracker;

    beforeEach(() => {
        tracker = new ValueTracker(0);
    });

    it('should return the default value for an unknown ID', () => {
        expect(tracker.get('unknown')).toBe(0);
    });

    it('should set and get a value', () => {
        tracker.set('health', 100);
        expect(tracker.get('health')).toBe(100);
    });

    it('should use a custom default value', () => {
        tracker = new ValueTracker(10);
        expect(tracker.get('stamina')).toBe(10);
    });

    it('should adjust a value from the default', () => {
        const newValue = tracker.adjust('mana', 50);
        expect(newValue).toBe(50);
        expect(tracker.get('mana')).toBe(50);
    });

    it('should adjust an existing value', () => {
        tracker.set('health', 100);
        const newValue = tracker.adjust('health', -20);
        expect(newValue).toBe(80);
        expect(tracker.get('health')).toBe(80);
    });

    it('should check if a value exists', () => {
        expect(tracker.has('health')).toBe(false);
        tracker.set('health', 100);
        expect(tracker.has('health')).toBe(true);
    });

    it('should remove a value', () => {
        tracker.set('health', 100);
        expect(tracker.has('health')).toBe(true);
        const success = tracker.remove('health');
        expect(success).toBe(true);
        expect(tracker.has('health')).toBe(false);
        expect(tracker.get('health')).toBe(0); // Falls back to default
    });

    it('should serialize its state', () => {
        tracker.set('health', 80);
        tracker.set('mana', 50);
        const serialized = tracker.serialize();

        expect(serialized).toEqual({
            values: [['health', 80], ['mana', 50]],
            defaultValue: 0
        });
    });

    it('should deserialize its state', () => {
        const data = {
            values: [['health', 80], ['mana', 50]] as [string, number][],
            defaultValue: 10
        };
        tracker.deserialize(data);

        expect(tracker.get('health')).toBe(80);
        expect(tracker.get('mana')).toBe(50);
        expect(tracker.get('stamina')).toBe(10); // Check new default
    });
});