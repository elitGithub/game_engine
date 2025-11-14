// engine/tests/GameClockPlugin.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameClockPlugin } from '@engine/plugins/GameClockPlugin';
import { EventBus } from '@engine/core/EventBus';
import type { IEngineHost } from '@engine/types';
import { createMockLogger } from './helpers/loggerMocks';
const mockLogger = createMockLogger();

// Mock dependencies
vi.mock('@engine/core/EventBus');

describe('GameClockPlugin', () => {
    let plugin: GameClockPlugin;
    let mockHost: IEngineHost;
    let mockEventBus: EventBus;

    beforeEach(() => {
        vi.clearAllMocks();

        mockEventBus = new EventBus(mockLogger);
        vi.spyOn(mockEventBus, 'emit');

        plugin = new GameClockPlugin({
            unitsPerDay: 24,
            initialDay: 1,
            initialUnit: 6, // Day 1, 6:00
        });

        mockHost = {
            context: {},
            eventBus: mockEventBus,
            registerSerializableSystem: vi.fn(),
        } as unknown as IEngineHost;

        plugin.install(mockHost);
    });

    it('should initialize with correct time', () => {
        expect(plugin.getCurrentDay()).toBe(1);
        expect(plugin.getCurrentUnit()).toBe(6);
        expect(plugin.getAbsoluteTime()).toBe(30); // 1 * 24 + 6
    });

    it('should advance time within the same day', () => {
        plugin.advance(2); // Advance 2 hours

        expect(plugin.getCurrentDay()).toBe(1);
        expect(plugin.getCurrentUnit()).toBe(8);
        expect(mockEventBus.emit).toHaveBeenCalledWith('clock.advanced', {
            units: 2,
            currentUnit: 8,
            currentDay: 1
        });
        expect(mockEventBus.emit).not.toHaveBeenCalledWith('clock.dayChanged', expect.any(Object));
    });

    it('should advance time and trigger a new day', () => {
        plugin.advance(20); // Advance 20 hours (from 6:00 to 26:00)

        expect(plugin.getCurrentDay()).toBe(2); // Day 2
        expect(plugin.getCurrentUnit()).toBe(2); // 2:00
        expect(mockEventBus.emit).toHaveBeenCalledWith('clock.dayChanged', {
            day: 2,
            previousDay: 1
        });
        expect(mockEventBus.emit).toHaveBeenCalledWith('clock.advanced', {
            units: 20,
            currentUnit: 2,
            currentDay: 2
        });
    });

    it('should register and check time of day ranges', () => {
        plugin.registerTimeOfDay('Morning', 6, 12); // 6:00 - 11:59
        plugin.registerTimeOfDay('Night', 22, 5);  // 22:00 - 4:59 (wraps)

        // Current time is 6:00
        expect(plugin.isTimeOfDay('Morning')).toBe(true);
        expect(plugin.isTimeOfDay('Night')).toBe(false);

        plugin.advance(10); // -> 16:00
        expect(plugin.isTimeOfDay('Morning')).toBe(false);
        expect(plugin.isTimeOfDay('Night')).toBe(false);

        plugin.advance(8); // -> 24:00 (Day 2, 0:00)
        expect(plugin.isTimeOfDay('Morning')).toBe(false);
        expect(plugin.isTimeOfDay('Night')).toBe(true);
    });

    it('should emit timeOfDayChanged event', () => {
        plugin.registerTimeOfDay('Morning', 6, 12);
        plugin.registerTimeOfDay('Afternoon', 12, 18);

        // At 6:00, "Morning"
        expect(plugin.isTimeOfDay('Morning')).toBe(true);

        plugin.advance(6); // -> 12:00

        expect(plugin.isTimeOfDay('Afternoon')).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('clock.timeOfDayChanged', {
            rangeName: 'Afternoon',
            previousRange: 'Morning'
        });
    });

    it('should serialize and deserialize', () => {
        plugin.registerTimeOfDay('Morning', 6, 12);
        plugin.advance(10); // Day 1, 16:00

        const serialized = plugin.serialize();
        expect(serialized.absoluteTime).toBe(40); // 1*24 + 16

        const newPlugin = new GameClockPlugin({ unitsPerDay: 1000 }); // Different config
        newPlugin.deserialize(serialized);

        expect(newPlugin.getCurrentUnit()).toBe(16);
        expect(newPlugin.getCurrentDay()).toBe(1);
        expect(newPlugin.getAbsoluteTime()).toBe(40);
        expect(newPlugin.isTimeOfDay('Morning')).toBe(false); // ranges were restored
    });
});