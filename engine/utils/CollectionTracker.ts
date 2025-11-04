// engine/utils/CollectionTracker.ts
import type { ISerializable } from '../types';

export class CollectionTracker implements ISerializable {
    private items: Map<string, number>;

    constructor() {
        this.items = new Map();
    }

    add(itemId: string, quantity: number = 1): void {
        const current = this.items.get(itemId) || 0;
        this.items.set(itemId, current + quantity);
    }

    remove(itemId: string, quantity: number = 1): boolean {
        const current = this.items.get(itemId) || 0;
        if (current < quantity) return false;

        const newQuantity = current - quantity;
        if (newQuantity === 0) {
            this.items.delete(itemId);
        } else {
            this.items.set(itemId, newQuantity);
        }
        return true;
    }

    has(itemId: string, quantity: number = 1): boolean {
        return (this.items.get(itemId) || 0) >= quantity;
    }

    getQuantity(itemId: string): number {
        return this.items.get(itemId) || 0;
    }

    getAll(): Map<string, number> {
        return new Map(this.items);
    }

    getAllIds(): string[] {
        return Array.from(this.items.keys());
    }

    clear(): void {
        this.items.clear();
    }

    serialize(): any {
        return Array.from(this.items.entries());
    }

    deserialize(data: any): void {
        this.items = new Map(data || []);
    }
}