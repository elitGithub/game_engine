// engine/tests/MigrationManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MigrationManager } from '@engine/systems/MigrationManager';
import type { SaveData } from '@engine/systems/SaveManager';
import type { MigrationFunction } from '@engine/types';
import {ILogger} from "@engine/interfaces";
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
/**
 * This test file now owns all migration-related logic,
 * moved from SaveManager.test.ts
 */
describe('MigrationManager', () => {
    let migrationManager: MigrationManager;
    let mockMigrationFunctions: Map<string, MigrationFunction>;

    beforeEach(() => {
        mockMigrationFunctions = new Map<string, MigrationFunction>();
        migrationManager = new MigrationManager(mockMigrationFunctions, mockLogger);

        // Spy on console warnings for one test
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should not migrate data if versions match', () => {
        const currentVersion = '1.0.0';
        const mockSaveFile: SaveData = {
            version: '1.0.0',
            timestamp: 12345,
            currentSceneId: 's1',
            systems: { player: { health: 100 } }
        };

        const migrationV1toV2 = vi.fn();
        mockMigrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV2);

        const migratedData = migrationManager.migrate(mockSaveFile, currentVersion);

        expect(migrationV1toV2).not.toHaveBeenCalled();
        expect(migratedData).toBe(mockSaveFile); // Should return the exact same object
        expect(migratedData.version).toBe('1.0.0');
    });

    it('should apply a single migration (e.g., 1.0.0 to 1.1.0)', () => {
        const currentVersion = '1.1.0'; // Game is updated
        const mockSaveFile: SaveData = {
            version: '1.0.0', // Old save file
            timestamp: 12345,
            currentSceneId: 's1',
            systems: { player: { oldHealth: 100 } } // Old data structure
        };

        // Create the migration function
        const migrationV1toV2 = vi.fn((data: any) => {
            data.systems.player.health = data.systems.player.oldHealth; // transform
            delete data.systems.player.oldHealth;
            return data;
        });
        mockMigrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV2);

        const migratedData = migrationManager.migrate(mockSaveFile, currentVersion);

        expect(migrationV1toV2).toHaveBeenCalledOnce();
        // Ensure the *migrated* data is correct
        expect(migratedData.systems.player).toEqual({ health: 100 });
        expect(migratedData.version).toBe('1.1.0');
    });

    it('should apply multiple migrations in sequence (e.g., 1.0.0 to 1.2.0)', () => {
        const currentVersion = '1.2.0'; // Game is updated
        const mockSaveFile: SaveData = {
            version: '1.0.0', // Old save file
            timestamp: 12345,
            currentSceneId: 's1',
            systems: { player: { name: "Hero" } }
        };

        // Migration 1: 1.0.0 -> 1.1.0
        const migrationV1toV1_1 = vi.fn((data: any) => {
            data.systems.player.stats = { name: data.systems.player.name }; // Nest stats
            delete data.systems.player.name;
            return data;
        });

        // Migration 2: 1.1.0 -> 1.2.0
        const migrationV1_1toV1_2 = vi.fn((data: any) => {
            data.systems.player.stats.health = 100; // Add new health prop
            return data;
        });

        mockMigrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV1_1);
        mockMigrationFunctions.set('1.1.0_to_1.2.0', migrationV1_1toV1_2);

        const migratedData = migrationManager.migrate(mockSaveFile, currentVersion);

        expect(migrationV1toV1_1).toHaveBeenCalledOnce();
        expect(migrationV1_1toV1_2).toHaveBeenCalledOnce();

        // Ensure the final, fully-migrated data is correct
        expect(migratedData.systems.player).toEqual({
            stats: { name: "Hero", health: 100 }
        });
        expect(migratedData.version).toBe('1.2.0');
    });

    it('should handle missing migrations gracefully', () => {
        const currentVersion = '1.2.0';
        const mockSaveFile: SaveData = {
            version: '1.0.0',
            timestamp: 12345,
            currentSceneId: 's1',
            systems: { player: { health: 100 } }
        };

        // ONLY provide the 1.1 -> 1.2 migration
        const migrationV1_1toV1_2 = vi.fn((data: any) => {
             data.systems.player.health = data.systems.player.health * 2; // Double health
             return data;
        });
        mockMigrationFunctions.set('1.1.0_to_1.2.0', migrationV1_1toV1_2);

        const migratedData = migrationManager.migrate(mockSaveFile, currentVersion);

        // It should NOT run the migration it has
        expect(migrationV1_1toV1_2).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('[MigrationManager] No migration found for 1.0.0_to_1.1.0')
        );

        // It should return the data largely as-is, but with the version stamped
        expect(migratedData.systems.player).toEqual({ health: 100 });
        expect(migratedData.version).toBe('1.2.0');
    });
});