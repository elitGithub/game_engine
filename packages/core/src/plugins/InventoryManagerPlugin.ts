// engine/plugins/InventoryManagerPlugin.ts

import type { IEngineHost, IEnginePlugin } from '@game-engine/core/types';
import type { EventBus } from '@game-engine/core/core/EventBus';
import { CollectionTracker } from '@game-engine/core/utils/CollectionTracker';

export interface InventoryConfig {
    /**
     * The maximum number of *unique* item stacks.
     * Use 'Infinity' for no limit.
     */
    capacity?: number;
}

// For type-safe DI:
export const INVENTORY_SYSTEM_KEY = Symbol('InventoryPluginSystem');

// For save file (JSON) serialization:
export const INVENTORY_SERIALIZATION_KEY = 'inventory';

export class InventoryManagerPlugin implements IEnginePlugin {
    name = 'inventory';
    version = '1.0.0';

    private tracker: CollectionTracker;
    private config: Required<InventoryConfig>;
    private eventBus!: EventBus; // Initialized in install()

    constructor(config: InventoryConfig = {}) {
        this.config = {
            capacity: config.capacity ?? Infinity,
        };
        // The backend that does the actual work and gets serialized
        this.tracker = new CollectionTracker();
    }

    install(engine: IEngineHost): void {
        this.eventBus = engine.eventBus;
        engine.registerSerializableSystem(INVENTORY_SERIALIZATION_KEY, this.tracker);
    }

    uninstall(engine: IEngineHost): void {
        engine.unregisterSerializableSystem(INVENTORY_SERIALIZATION_KEY);
    }

    /**
     * Adds an item to the inventory.
     * @returns True if the item was added, false if not (e.g., inventory full).
     */
    add(itemId: string, quantity: number = 1): boolean {
        const currentQuantity = this.tracker.getQuantity(itemId);

        // Check capacity *only if* this is a new item stack.
        if (currentQuantity === 0) {
            if (this.tracker.getAllIds().length >= this.config.capacity) {
                this.eventBus.emit('inventory.add.failed.full', {
                    itemId,
                    quantityAttempted: quantity
                });
                return false;
            }
        }

        // This logic is simple because CollectionTracker handles the math.
        this.tracker.add(itemId, quantity);

        this.eventBus.emit('inventory.item.added', {
            itemId,
            quantityAdded: quantity,
            newTotal: this.tracker.getQuantity(itemId)
        });

        return true;
    }

    /**
     * Removes an item from the inventory.
     * @returns True if the item was removed, false if not (e.g., not enough items).
     */
    remove(itemId: string, quantity: number = 1): boolean {
        // CollectionTracker.remove() returns false if not enough
        const success = this.tracker.remove(itemId, quantity);

        if (success) {
            this.eventBus.emit('inventory.item.removed', {
                itemId,
                quantityRemoved: quantity,
                newTotal: this.tracker.getQuantity(itemId)
            });
        }

        return success;
    }

    /**
     * Checks if the inventory contains a specific quantity of an item.
     */
    has(itemId: string, quantity: number = 1): boolean {
        return this.tracker.has(itemId, quantity);
    }

    /**
     * Gets the quantity of a specific item.
     */
    getQuantity(itemId: string): number {
        return this.tracker.getQuantity(itemId);
    }

    /**
     * Gets the entire inventory as a Map of ItemID -> Quantity.
     * Ideal for UI rendering.
     */
    getAll(): Map<string, number> {
        return this.tracker.getAll();
    }

    /**
     * Gets a list of all unique item IDs.
     */
    getAllIds(): string[] {
        return this.tracker.getAllIds();
    }

    /**
     * Checks if the inventory has reached its unique item stack limit.
     */
    isFull(): boolean {
        if (this.config.capacity === Infinity) return false;
        return this.tracker.getAllIds().length >= this.config.capacity;
    }

    /**
     * Gets the current number of unique item stacks.
     */
    getSlotCount(): number {
        return this.tracker.getAllIds().length;
    }

    /**
     * Gets the configured capacity.
     */
    getCapacity(): number {
        return this.config.capacity;
    }
}