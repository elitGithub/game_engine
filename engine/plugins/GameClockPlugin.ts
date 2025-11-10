// engine/plugins/GameClockPlugin.ts
import type { IEngineHost, IEnginePlugin, TypedGameContext, ISerializable } from '../types';
import {EventBus} from "@engine/core/EventBus";

export interface ClockConfig {
    unitsPerDay: number;
    initialDay?: number;
    initialUnit?: number;
}

interface TimeRange {
    startUnit: number;
    endUnit: number;
}

export class GameClockPlugin implements IEnginePlugin, ISerializable {
    name = 'clock';
    version = '1.0.0';

    private absoluteTime: number;
    private unitsPerDay: number;
    private eventBus: EventBus | undefined = undefined;
    private timeRanges: Map<string, TimeRange>;

    constructor(config: ClockConfig) {
        this.unitsPerDay = config.unitsPerDay;
        this.absoluteTime = (config.initialDay || 0) * this.unitsPerDay + (config.initialUnit || 0);
        this.timeRanges = new Map();
    }

    install(engine: IEngineHost): void {
        this.eventBus = engine.eventBus;
        engine.context.clock = this;
        engine.registerSerializableSystem('clock', this);
    }

    uninstall(engine: IEngineHost): void {
        delete engine.context.clock;
    }

    update(deltaTime: number, context: TypedGameContext<any>): void {
        // Clock doesn't auto-advance - game calls advance() explicitly
        // This is here in case you want real-time mode in the future
    }

    advance(units: number): void {
        const oldDay = this.getCurrentDay();
        const oldUnit = this.getCurrentUnit();

        this.absoluteTime += units;

        const newDay = this.getCurrentDay();
        const newUnit = this.getCurrentUnit();

        if (newDay !== oldDay) {
            this.eventBus?.emit('clock.dayChanged', { day: newDay, previousDay: oldDay });
        }

        const oldRange = this.getCurrentTimeRange(oldUnit);
        const newRange = this.getCurrentTimeRange(newUnit);

        if (oldRange !== newRange) {
            this.eventBus?.emit('clock.timeOfDayChanged', {
                rangeName: newRange,
                previousRange: oldRange
            });
        }

        this.eventBus?.emit('clock.advanced', {
            units,
            currentUnit: newUnit,
            currentDay: newDay
        });
    }

    getCurrentUnit(): number {
        return this.absoluteTime % this.unitsPerDay;
    }

    getCurrentDay(): number {
        return Math.floor(this.absoluteTime / this.unitsPerDay);
    }

    getAbsoluteTime(): number {
        return this.absoluteTime;
    }

    isTimeOfDay(rangeName: string): boolean {
        const range = this.timeRanges.get(rangeName);
        if (!range) return false;

        const currentUnit = this.getCurrentUnit();

        if (range.startUnit <= range.endUnit) {
            return currentUnit >= range.startUnit && currentUnit < range.endUnit;
        } else {
            return currentUnit >= range.startUnit || currentUnit < range.endUnit;
        }
    }

    registerTimeOfDay(name: string, startUnit: number, endUnit: number): void {
        this.timeRanges.set(name, { startUnit, endUnit });
    }

    private getCurrentTimeRange(unit: number): string | null {
        for (const [name, range] of this.timeRanges.entries()) {
            if (range.startUnit <= range.endUnit) {
                if (unit >= range.startUnit && unit < range.endUnit) {
                    return name;
                }
            } else {
                if (unit >= range.startUnit || unit < range.endUnit) {
                    return name;
                }
            }
        }
        return null;
    }

    serialize(): any {
        return {
            absoluteTime: this.absoluteTime,
            unitsPerDay: this.unitsPerDay,
            timeRanges: Array.from(this.timeRanges.entries())
        };
    }

    deserialize(data: any): void {
        this.absoluteTime = data.absoluteTime || 0;
        this.unitsPerDay = data.unitsPerDay || 24;
        this.timeRanges = new Map(data.timeRanges || []);
    }
}