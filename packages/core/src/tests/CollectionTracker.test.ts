// engine/utils/CollectionTracker.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {CollectionTracker} from "@game-engine/core/utils/CollectionTracker";


describe('CollectionTracker', () => {
    let tracker: CollectionTracker;

    beforeEach(() => {
        tracker = new CollectionTracker();
    });

    it('should add an item', () => {
        tracker.add('potion', 1);
        expect(tracker.getQuantity('potion')).toBe(1);
    });

    it('should add multiple items', () => {
        tracker.add('potion', 5);
        expect(tracker.getQuantity('potion')).toBe(5);
    });

    it('should add to an existing stack', () => {
        tracker.add('potion', 1);
        tracker.add('potion', 3);
        expect(tracker.getQuantity('potion')).toBe(4);
    });

    it('should return 0 for an unknown item', () => {
        expect(tracker.getQuantity('unknown')).toBe(0);
    });

    it('should remove an item', () => {
        tracker.add('potion', 5);
        const success = tracker.remove('potion', 2);
        expect(success).toBe(true);
        expect(tracker.getQuantity('potion')).toBe(3);
    });

    it('should fail to remove more items than available', () => {
        tracker.add('potion', 2);
        const success = tracker.remove('potion', 3);
        expect(success).toBe(false);
        expect(tracker.getQuantity('potion')).toBe(2); // Unchanged
    });

    it('should remove an item completely', () => {
        tracker.add('potion', 3);
        const success = tracker.remove('potion', 3);
        expect(success).toBe(true);
        expect(tracker.getQuantity('potion')).toBe(0);
        expect(tracker.has('potion')).toBe(false);
    });

    it('should check if it has an item', () => {
        expect(tracker.has('potion')).toBe(false);
        tracker.add('potion', 1);
        expect(tracker.has('potion')).toBe(true);
    });

    it('should check if it has a specific quantity', () => {
        tracker.add('potion', 5);
        expect(tracker.has('potion', 3)).toBe(true);
        expect(tracker.has('potion', 5)).toBe(true);
        expect(tracker.has('potion', 6)).toBe(false);
    });

    it('should get all items', () => {
        tracker.add('potion', 3);
        tracker.add('elixir', 1);
        const all = tracker.getAll();
        expect(all.get('potion')).toBe(3);
        expect(all.get('elixir')).toBe(1);
        expect(all.size).toBe(2);
    });

    it('should get all item IDs', () => {
        tracker.add('potion', 3);
        tracker.add('elixir', 1);
        const ids = tracker.getAllIds();
        expect(ids).toContain('potion');
        expect(ids).toContain('elixir');
        expect(ids.length).toBe(2);
    });

    it('should serialize its state', () => {
        tracker.add('potion', 5);
        tracker.add('arrow', 50);
        const serialized = tracker.serialize();
        expect(serialized).toEqual([['potion', 5], ['arrow', 50]]);
    });

    it('should deserialize its state', () => {
        const data: [string, number][] = [['potion', 5], ['arrow', 50]];
        tracker.deserialize(data);
        expect(tracker.getQuantity('potion')).toBe(5);
        expect(tracker.getQuantity('arrow')).toBe(50);
    });
});