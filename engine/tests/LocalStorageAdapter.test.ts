// engine/tests/LocalStorageAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '@engine/platform/browser/LocalStorageAdapter';

// Mock global localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
        get length() {
            return Object.keys(store).length;
        },
    };
})();

vi.stubGlobal('localStorage', localStorageMock);

describe('LocalStorageAdapter', () => {
    let adapter: LocalStorageAdapter;

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks(); // Clears spy history
        adapter = new LocalStorageAdapter('test_prefix_');
    });

    it('should save data with the correct prefix', async () => {
        const data = '{"player":"Hero"}';
        await adapter.save('slot1', data);

        expect(localStorageMock.setItem).toHaveBeenCalledWith('test_prefix_slot1', data);
    });

    it('should load data with the correct prefix', async () => {
        localStorageMock.setItem('test_prefix_slot1', '{"player":"Hero"}');

        const data = await adapter.load('slot1');

        expect(localStorageMock.getItem).toHaveBeenCalledWith('test_prefix_slot1');
        expect(data).toBe('{"player":"Hero"}');
    });

    it('should delete data with the correct prefix', async () => {
        await adapter.delete('slot1');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('test_prefix_slot1');
    });

    it('should list all saves and sort by timestamp', async () => {
        // Mock the store directly for list()
        const save1 = { timestamp: 100, metadata: { name: 'Save 1' } };
        const save2 = { timestamp: 200, metadata: { name: 'Save 2' } };
        localStorageMock.setItem('test_prefix_slot1', JSON.stringify(save1));
        localStorageMock.setItem('test_prefix_slot2', JSON.stringify(save2));
        localStorageMock.setItem('other_key', 'not a save');

        const saves = await adapter.list();

        expect(saves).toHaveLength(2);
        // Should be sorted descending by timestamp
        expect(saves[0].slotId).toBe('slot2');
        expect(saves[1].slotId).toBe('slot1');
        expect(saves[0].timestamp).toBe(200);
    });
});