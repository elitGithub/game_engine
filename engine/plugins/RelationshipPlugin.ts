// engine/plugins/RelationshipPlugin.ts
import type { IEngineHost, IEnginePlugin } from '../types';
import { ValueTracker } from '../utils/ValueTracker';

export interface RelationshipConfig {
    defaultValue?: number;
    min?: number;
    max?: number;
}

export class RelationshipPlugin implements IEnginePlugin {
    name = 'relationships';
    version = '1.0.0';

    private tracker: ValueTracker;
    private config: Required<RelationshipConfig>;
    private ranks: Map<string, { threshold: number }>;

    constructor(config: RelationshipConfig = {}) {
        this.config = {
            defaultValue: config.defaultValue ?? 0,
            min: config.min ?? -100,
            max: config.max ?? 100
        };
        this.tracker = new ValueTracker(this.config.defaultValue);
        this.ranks = new Map();
    }

    install(engine: IEngineHost): void {
        engine.context.relationships = this;
        engine.registerSerializableSystem('relationships', this.tracker);
    }

    uninstall(engine: IEngineHost): void {
        delete engine.context.relationships;
    }

    setValue(npcId: string, value: number): void {
        const clamped = Math.max(this.config.min, Math.min(this.config.max, value));
        this.tracker.set(npcId, clamped);
    }

    getValue(npcId: string): number {
        return this.tracker.get(npcId);
    }

    adjustValue(npcId: string, amount: number): number {
        const newValue = this.tracker.adjust(npcId, amount);
        const clamped = Math.max(this.config.min, Math.min(this.config.max, newValue));
        this.tracker.set(npcId, clamped);
        return clamped;
    }

    checkValue(npcId: string, comparison: '>=' | '<=', threshold: number): boolean {
        const value = this.getValue(npcId);
        return comparison === '>=' ? value >= threshold : value <= threshold;
    }

    registerRank(rankName: string, threshold: number): void {
        this.ranks.set(rankName, { threshold });
    }

    getRank(npcId: string): string | null {
        const value = this.getValue(npcId);
        let bestRank: string | null = null;
        let bestThreshold = -Infinity;

        this.ranks.forEach(({ threshold }, name) => {
            if (value >= threshold && threshold > bestThreshold) {
                bestRank = name;
                bestThreshold = threshold;
            }
        });

        return bestRank;
    }
}