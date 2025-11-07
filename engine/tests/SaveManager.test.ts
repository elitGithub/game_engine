// engine/tests/SaveManager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager } from '@engine/systems/SaveManager';
import type { SaveData } from '@engine/systems/SaveManager';
import { EventBus } from '@engine/core/EventBus';
import type { ISerializationRegistry, ISerializable, MigrationFunction } from '@engine/types';
import type { StorageAdapter } from '@engine/core/StorageAdapter';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/LocalStorageAdapter'); // Mock the default adapter

// Mock a sample serializable system (like a Player class)
const mockPlayer: ISerializable = {
    serialize: vi.fn(() => ({ health: 100 })),
    deserialize: vi.fn(),
};

// Mock the storage adapter interface
const mockStorageAdapter: StorageAdapter = {
    save: vi.fn(),
    load: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
};

describe('SaveManager', () => {
    let saveManager: SaveManager;
    let mockEventBus: EventBus;
    let mockRegistry: ISerializationRegistry;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();
        vi.useFakeTimers(); // <-- ADD THIS: Take control of timers

        mockEventBus = new EventBus();

        // Create a fully-functional mock for the ISerializationRegistry
        mockRegistry = {
            serializableSystems: new Map<string, ISerializable>([
                ['player', mockPlayer]
            ]),
            migrationFunctions: new Map<string, MigrationFunction>(),
            gameVersion: '1.0.0',
            getCurrentSceneId: vi.fn(() => 'scene_start'),
            restoreScene: vi.fn(),
        };

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Instantiate the SaveManager, injecting the mock adapter
        saveManager = new SaveManager(mockEventBus, mockRegistry, mockStorageAdapter);
    });

    afterEach(() => { // <-- ADD THIS ENTIRE BLOCK
        vi.useRealTimers(); // <-- Release control of timers after each test
    });

    describe('saveGame', () => {
        it('should call serialize on all registered systems', async () => {
            await saveManager.saveGame('slot1');
            expect(mockPlayer.serialize).toHaveBeenCalledOnce();
        });

        it('should call storageAdapter.save with correctly structured JSON', async () => {
            const mockDate = new Date(2025, 0, 1, 12, 0, 0); // 1st Jan 2025, 12:00
            vi.setSystemTime(mockDate); // <-- ADD THIS: Set a specific time

            const expectedSaveData = {
                version: '1.0.0',
                timestamp: mockDate.getTime(), // <-- CHANGE THIS: Use the exact time
                currentSceneId: 'scene_start',
                systems: {
                    player: { health: 100 }
                },
                metadata: {}
            };

            await saveManager.saveGame('slot1');

            expect(mockStorageAdapter.save).toHaveBeenCalledWith(
                'slot1',
                JSON.stringify(expectedSaveData)
            );
        });

        it('should emit "save.completed" on success', async () => {
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);
            await saveManager.saveGame('slot1');
            expect(mockEventBus.emit).toHaveBeenCalledWith('save.completed', expect.any(Object));
        });

        it('should emit "save.failed" on failure', async () => {
            const error = new Error('Storage full');
            vi.mocked(mockStorageAdapter.save).mockRejectedValue(error);
            await saveManager.saveGame('slot1');
            expect(mockEventBus.emit).toHaveBeenCalledWith('save.failed', { slotId: 'slot1', error });
        });
    });

    describe('loadGame', () => {
        it('should call deserialize on all registered systems', async () => {
            const mockSaveFile: SaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                currentSceneId: 'scene_2',
                systems: {
                    player: { health: 80 }
                }
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            await saveManager.loadGame('slot1');

            expect(mockPlayer.deserialize).toHaveBeenCalledWith({ health: 80 });
        });

        it('should call registry.restoreScene with the saved sceneId', async () => {
            const mockSaveFile: SaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                currentSceneId: 'scene_boss_fight',
                systems: {}
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            await saveManager.loadGame('slot1');

            expect(mockRegistry.restoreScene).toHaveBeenCalledWith('scene_boss_fight');
        });

        it('should emit "save.loaded" on success', async () => {
             const mockSaveFile: SaveData = { version: '1.0.0', timestamp: 12345, currentSceneId: 's1', systems: {} };
             vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

             await saveManager.loadGame('slot1');

             expect(mockEventBus.emit).toHaveBeenCalledWith('save.loaded', { slotId: 'slot1', timestamp: 12345 });
        });
    });

    describe('Data Migration', () => {
        // This is the most important section to test!
        it('should not migrate data if versions match', async () => {
            (mockRegistry as { gameVersion: string }).gameVersion = '1.0.0';
            const mockSaveFile: SaveData = {
                version: '1.0.0',
                timestamp: 12345,
                currentSceneId: 's1',
                systems: { player: { health: 100 } }
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            // Register a migration that *shouldn't* run
            const migrationV1toV2 = vi.fn();
            mockRegistry.migrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV2);

            await saveManager.loadGame('slot1');

            expect(migrationV1toV2).not.toHaveBeenCalled();
            expect(mockPlayer.deserialize).toHaveBeenCalledWith({ health: 100 });
        });

        it('should apply a single migration (e.g., 1.0.0 to 1.1.0)', async () => {
            (mockRegistry as { gameVersion: string }).gameVersion = '1.1.0'; // Game is updated
            const mockSaveFile: SaveData = {
                version: '1.0.0', // Old save file
                timestamp: 12345,
                currentSceneId: 's1',
                systems: { player: { oldHealth: 100 } } // Old data structure
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            // Create the migration function
            const migrationV1toV2 = vi.fn((data: any) => {
                data.systems.player.health = data.systems.player.oldHealth; // transform
                delete data.systems.player.oldHealth;
                return data;
            });
            mockRegistry.migrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV2);

            await saveManager.loadGame('slot1');

            expect(migrationV1toV2).toHaveBeenCalledOnce();
            // Ensure the *migrated* data is deserialized
            expect(mockPlayer.deserialize).toHaveBeenCalledWith({ health: 100 });
        });

        it('should apply multiple migrations in sequence (e.g., 1.0.0 to 1.2.0)', async () => {
            (mockRegistry as { gameVersion: string }).gameVersion = '1.2.0'; // Game is updated
            const mockSaveFile: SaveData = {
                version: '1.0.0', // Old save file
                timestamp: 12345,
                currentSceneId: 's1',
                systems: { player: { name: "Hero" } }
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

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

            mockRegistry.migrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV1_1);
            mockRegistry.migrationFunctions.set('1.1.0_to_1.2.0', migrationV1_1toV1_2);

            await saveManager.loadGame('slot1');

            expect(migrationV1toV1_1).toHaveBeenCalledOnce();
            expect(migrationV1_1toV1_2).toHaveBeenCalledOnce();

            // Ensure the final, fully-migrated data is deserialized
            expect(mockPlayer.deserialize).toHaveBeenCalledWith({
                stats: { name: "Hero", health: 100 }
            });
        });

        it.todo('should handle missing migrations gracefully');
    });
});