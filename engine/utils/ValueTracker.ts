// engine/utils/ValueTracker.ts
import type { ISerializable } from '../types';

interface ValueTrackerSaveData {
    values: [string, number][];
    defaultValue: number;
}

export class ValueTracker implements ISerializable {
    private values: Map<string, number>;
    private defaultValue: number;

    constructor(defaultValue: number = 0) {
        this.values = new Map();
        this.defaultValue = defaultValue;
    }

    set(id: string, value: number): void {
        this.values.set(id, value);
    }

    get(id: string): number {
        return this.values.get(id) ?? this.defaultValue;
    }

    adjust(id: string, amount: number): number {
        const current = this.get(id);
        const newValue = current + amount;
        this.set(id, newValue);
        return newValue;
    }

    has(id: string): boolean {
        return this.values.has(id);
    }

    remove(id: string): boolean {
        return this.values.delete(id);
    }

    getAll(): Map<string, number> {
        return new Map(this.values);
    }

    clear(): void {
        this.values.clear();
    }

    serialize(): ValueTrackerSaveData {
        return {
            values: Array.from(this.values.entries()),
            defaultValue: this.defaultValue
        };
    }

    deserialize(data: ValueTrackerSaveData): void {
        this.values = new Map(data.values || []);
        this.defaultValue = data.defaultValue ?? 0;
    }
}