// engine/tests/InventoryManagerPlugin.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryManagerPlugin } from '@engine/plugins/InventoryManagerPlugin';
import { CollectionTracker } from '@engine/utils/CollectionTracker';
import { EventBus } from '@engine/core/EventBus';
import type { IEngineHost } from '@engine/types';
import {ILogger} from "@engine/interfaces";

// Mock dependencies
vi.mock('@engine/utils/CollectionTracker');
vi.mock('@engine/core/EventBus');
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
describe('InventoryManagerPlugin', () => {
    let plugin: InventoryManagerPlugin;
    let mockHost: IEngineHost;
    let mockEventBus: EventBus;
    let mockTracker: CollectionTracker;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock instances
        mockEventBus = new EventBus(mockLogger);
        mockTracker = new (vi.mocked(CollectionTracker))();

        // Mock the CollectionTracker constructor to return our mock instance
        vi.mocked(CollectionTracker).mockImplementation(() => mockTracker);

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Spy on CollectionTracker methods
        vi.spyOn(mockTracker, 'add');
        vi.spyOn(mockTracker, 'remove').mockReturnValue(true);
        vi.spyOn(mockTracker, 'getQuantity').mockReturnValue(0);
        vi.spyOn(mockTracker, 'getAllIds').mockReturnValue([]);

        plugin = new InventoryManagerPlugin({ capacity: 10 });

        mockHost = {
            context: {},
            eventBus: mockEventBus,
            registerSerializableSystem: vi.fn(),
        } as unknown as IEngineHost;
    });

    it('should register itself and its tracker on install', () => {
        plugin.install(mockHost);

        // Plugin no longer mutates context (FLAG #9 fixed)
        // It only registers the tracker as a serializable system
        expect(mockHost.registerSerializableSystem).toHaveBeenCalledWith('inventory', mockTracker);
    });

    it('should add an item via the tracker', () => {
        plugin.install(mockHost);
        vi.mocked(mockTracker.getQuantity).mockReturnValue(0); // Item doesn't exist yet
        vi.mocked(mockTracker.getAllIds).mockReturnValue(['other_item']); // Not full

        const success = plugin.add('potion', 5);

        expect(success).toBe(true);
        expect(mockTracker.add).toHaveBeenCalledWith('potion', 5);
        expect(mockEventBus.emit).toHaveBeenCalledWith('inventory.item.added', expect.any(Object));
    });

    it('should fail to add an item if capacity is full', () => {
        plugin = new InventoryManagerPlugin({ capacity: 2 });
        plugin.install(mockHost);

        vi.mocked(mockTracker.getQuantity).mockReturnValue(0); // It's a new item
        vi.mocked(mockTracker.getAllIds).mockReturnValue(['item1', 'item2']); // Capacity is 2

        const success = plugin.add('potion', 1);

        expect(success).toBe(false);
        expect(mockTracker.add).not.toHaveBeenCalled();
        expect(mockEventBus.emit).toHaveBeenCalledWith('inventory.add.failed.full', expect.any(Object));
    });

    it('should add to an existing stack even if inventory is full', () => {
        plugin = new InventoryManagerPlugin({ capacity: 2 });
        plugin.install(mockHost);

        vi.mocked(mockTracker.getQuantity).mockReturnValue(5); // Item *already exists*
        vi.mocked(mockTracker.getAllIds).mockReturnValue(['potion', 'item2']); // Capacity is 2

        const success = plugin.add('potion', 1);

        expect(success).toBe(true);
        expect(mockTracker.add).toHaveBeenCalledWith('potion', 1);
        expect(mockEventBus.emit).toHaveBeenCalledWith('inventory.item.added', expect.any(Object));
    });

    it('should remove an item via the tracker', () => {
        plugin.install(mockHost);
        vi.mocked(mockTracker.remove).mockReturnValue(true); // Removal succeeds

        const success = plugin.remove('potion', 1);

        expect(success).toBe(true);
        expect(mockTracker.remove).toHaveBeenCalledWith('potion', 1);
        expect(mockEventBus.emit).toHaveBeenCalledWith('inventory.item.removed', expect.any(Object));
    });

    it('should return false if tracker fails to remove item', () => {
        plugin.install(mockHost);
        vi.mocked(mockTracker.remove).mockReturnValue(false); // Not enough items

        const success = plugin.remove('potion', 99);

        expect(success).toBe(false);
        expect(mockTracker.remove).toHaveBeenCalledWith('potion', 99);
        expect(mockEventBus.emit).not.toHaveBeenCalledWith('inventory.item.removed', expect.any(Object));
    });

    it('should delegate all other methods to CollectionTracker', () => {
        plugin.has('potion', 1);
        expect(mockTracker.has).toHaveBeenCalledWith('potion', 1);

        plugin.getQuantity('potion');
        expect(mockTracker.getQuantity).toHaveBeenCalledWith('potion');

        plugin.getAll();
        expect(mockTracker.getAll).toHaveBeenCalledOnce();

        plugin.getAllIds();
        expect(mockTracker.getAllIds).toHaveBeenCalledOnce();
    });
});