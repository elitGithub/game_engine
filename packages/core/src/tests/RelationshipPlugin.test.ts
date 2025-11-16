// engine/tests/RelationshipPlugin.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RelationshipPlugin} from '@game-engine/core/plugins/RelationshipPlugin';
import {ValueTracker} from '@game-engine/core/utils/ValueTracker';
import type {IEngineHost} from '@game-engine/core/types';

// Mock dependencies
vi.mock('@game-engine/core/utils/ValueTracker');

describe('RelationshipPlugin', () => {
    let plugin: RelationshipPlugin;
    let mockHost: IEngineHost;
    let mockTracker: ValueTracker;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock instance
        mockTracker = new (vi.mocked(ValueTracker))();

        // Mock the ValueTracker constructor
        vi.mocked(ValueTracker).mockImplementation(() => mockTracker);

        // Spy on ValueTracker methods
        vi.spyOn(mockTracker, 'set');
        vi.spyOn(mockTracker, 'get').mockReturnValue(0);
        vi.spyOn(mockTracker, 'adjust').mockReturnValue(0);

        plugin = new RelationshipPlugin({defaultValue: 0, min: -100, max: 100});

        mockHost = {
            context: {},
            registerSerializableSystem: vi.fn(),
        } as unknown as IEngineHost;
    });

    it('should register its tracker on install', () => {
        plugin.install(mockHost);

        // Plugin no longer mutates context (FLAG #9 fixed)
        // It only registers the tracker as a serializable system
        expect(mockHost.registerSerializableSystem).toHaveBeenCalledWith('relationships', mockTracker);
    });

    it('should set a value', () => {
        plugin.setValue('npc1', 50);
        expect(mockTracker.set).toHaveBeenCalledWith('npc1', 50);
    });

    it('should clamp value to max', () => {
        plugin.setValue('npc1', 150);
        expect(mockTracker.set).toHaveBeenCalledWith('npc1', 100); // Clamped to 100
    });

    it('should clamp value to min', () => {
        plugin.setValue('npc1', -200);
        expect(mockTracker.set).toHaveBeenCalledWith('npc1', -100); // Clamped to -100
    });

    it('should get a value', () => {
        vi.mocked(mockTracker.get).mockReturnValue(25);
        const value = plugin.getValue('npc1');
        expect(value).toBe(25);
        expect(mockTracker.get).toHaveBeenCalledWith('npc1');
    });

    it('should adjust a value', () => {
        vi.mocked(mockTracker.adjust).mockReturnValue(10); // 0 + 10 = 10
        plugin.adjustValue('npc1', 10);

        expect(mockTracker.adjust).toHaveBeenCalledWith('npc1', 10);
        // It sets the clamped value
        expect(mockTracker.set).toHaveBeenCalledWith('npc1', 10);
    });

    it('should adjust and clamp a value', () => {
        vi.mocked(mockTracker.adjust).mockReturnValue(150); // 100 + 50 = 150

        const clampedValue = plugin.adjustValue('npc_max', 50);

        expect(mockTracker.adjust).toHaveBeenCalledWith('npc_max', 50);
        // It sets the *clamped* value
        expect(mockTracker.set).toHaveBeenCalledWith('npc_max', 100);
        expect(clampedValue).toBe(100);
    });

    it('should register and get ranks', () => {
        plugin.registerRank('Friend', 50);
        plugin.registerRank('Neutral', 0);
        plugin.registerRank('Enemy', -50);

        vi.mocked(mockTracker.get).mockReturnValue(75);
        expect(plugin.getRank('npc_friend')).toBe('Friend');

        vi.mocked(mockTracker.get).mockReturnValue(10);
        expect(plugin.getRank('npc_neutral')).toBe('Neutral');

        // --- FIX: Use a value that is >= -50 ---
        vi.mocked(mockTracker.get).mockReturnValue(-40);
        expect(plugin.getRank('npc_enemy')).toBe('Enemy');

        // --- FIX: Expect null for a value below all thresholds ---
        vi.mocked(mockTracker.get).mockReturnValue(-100);
        expect(plugin.getRank('npc_arch_enemy')).toBe(null);
    });
});