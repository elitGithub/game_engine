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

        // This test now just checks that migration is *attempted*
        // not the complex logic itself.
        it('should call migration logic before deserializing', async () => {
             // Set up a game version that differs from the save
            (mockRegistry as { gameVersion: string }).gameVersion = '1.1.0';
            const mockSaveFile: SaveData = {
                version: '1.0.0', // Old save file
                timestamp: 12345,
                currentSceneId: 's1',
                systems: { player: { oldHealth: 100 } } // Old data
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            // Create a *real* migration function for the registry
            const migrationV1toV2 = vi.fn((data: any) => {
                data.systems.player.health = data.systems.player.oldHealth;
                delete data.systems.player.oldHealth;
                return data;
            });
            mockRegistry.migrationFunctions.set('1.0.0_to_1.1.0', migrationV1toV2);

            // Re-create saveManager to pick up the new migration function
            saveManager = new SaveManager(mockEventBus, mockRegistry, mockStorageAdapter);

            await saveManager.loadGame('slot1');

            // Check that the *migrated* data was passed to deserialize
            expect(mockPlayer.deserialize).toHaveBeenCalledWith({ health: 100 });
        });
    });

});