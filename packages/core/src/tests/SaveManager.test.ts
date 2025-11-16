// engine/tests/SaveManager.test.ts

import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {SaveData} from '@game-engine/core/systems/SaveManager';
import {SaveManager} from '@game-engine/core/systems/SaveManager';
import {EventBus} from '@game-engine/core/core/EventBus';
import type {ISerializable, ISerializationRegistry, MigrationFunction} from '@game-engine/core/types';
import type {StorageAdapter} from '@game-engine/core/core/StorageAdapter';
import {createMockLogger} from './helpers/loggerMocks';
// Mock dependencies
vi.mock('@game-engine/core/core/EventBus');
vi.mock('@game-engine/core/systems/LocalStorageAdapter'); // Mock the default adapter

// Create mock plugins

const mockLogger = createMockLogger();
// Mock a sample serializable system (like a Player class)
const mockPlayer: ISerializable = {
    serialize: vi.fn(() => ({health: 100})),
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

        mockEventBus = new EventBus(mockLogger);

        // Create a fully-functional mock for the ISerializationRegistry
        const serializableSystems = new Map<string, ISerializable>([
            ['player', mockPlayer]
        ]);
        const migrationFunctions = new Map<string, MigrationFunction>();

        mockRegistry = {
            gameVersion: '1.0.0',
            registerSerializable: vi.fn((key: string, system: ISerializable) => {
                serializableSystems.set(key, system);
            }),
            unregisterSerializable: vi.fn((key: string) => {
                serializableSystems.delete(key);
            }),
            registerMigration: vi.fn((version: string, migrationFn: MigrationFunction) => {
                migrationFunctions.set(version, migrationFn);
            }),
            getSerializable: vi.fn((key: string) => serializableSystems.get(key)),
            hasSerializable: vi.fn((key: string) => serializableSystems.has(key)),
            getAllSerializables: vi.fn(() => serializableSystems as ReadonlyMap<string, ISerializable>),
            getAllMigrations: vi.fn(() => migrationFunctions as ReadonlyMap<string, MigrationFunction>),
            getCurrentSceneId: vi.fn(() => 'scene_start'),
            restoreScene: vi.fn(),
        };

        const mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

        // Spy on EventBus.emit
        vi.spyOn(mockEventBus, 'emit');

        // Instantiate the SaveManager, injecting the mock adapter
        saveManager = new SaveManager(mockEventBus, mockRegistry, mockStorageAdapter, mockTimerProvider, mockLogger);
    });

    afterEach(() => { // <-- ADD THIS ENTIRE BLOCK
        vi.useRealTimers(); // <-- Release control of timers after each test
    });

    describe('saveGame', () => {
        it('should call serialize on all registered systems', async () => {
            // Step 1: Manually serialize (this is what we're testing)
            const saveData = saveManager.serializeGameState();
            expect(mockPlayer.serialize).toHaveBeenCalledOnce();

            // Step 2: Pass the data to the save method
            await saveManager.saveGame('slot1', saveData);
        });

        it('should call storageAdapter.save with correctly structured JSON', async () => {
            const mockDate = new Date(2025, 0, 1, 12, 0, 0);
            vi.setSystemTime(mockDate);

            // 1. Define what we expect the serialized data to look like
            const expectedSaveData = {
                version: '1.0.0',
                timestamp: mockDate.getTime(),
                currentSceneId: 'scene_start',
                systems: {
                    player: {health: 100}
                },
                metadata: {}
            };

            // 2. (NEW) Explicitly call the serialize method
            // This is the "fast, synchronous" part.
            const saveData = saveManager.serializeGameState();

            // 3. (NEW) We can now test the serialization *directly*
            expect(saveData).toEqual(expectedSaveData);

            // 4. (NEW) Pass the generated data to the refactored saveGame method
            // This is the "slow, async" part (stringify + I/O).
            await saveManager.saveGame('slot1', saveData);

            // 5. The final assertion is unchanged and now *only* tests the save I/O
            expect(mockStorageAdapter.save).toHaveBeenCalledWith(
                'slot1',
                JSON.stringify(expectedSaveData)
            );
        });

        it('should emit "save.completed" on success', async () => {
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);

            // (NEW) Step 1: Get a valid SaveData object
            const saveData = saveManager.serializeGameState();

            // (MODIFIED) Step 2: Pass it to the refactored method
            await saveManager.saveGame('slot1', saveData);

            // The assertion remains the same
            expect(mockEventBus.emit).toHaveBeenCalledWith('save.completed', expect.any(Object));
        });

        it('should emit "save.failed" on failure', async () => {
            const error = new Error('Storage full');
            vi.mocked(mockStorageAdapter.save).mockRejectedValue(error);

            // (NEW) Step 1: Get a valid SaveData object
            const saveData = saveManager.serializeGameState();

            // (MODIFIED) Step 2: Pass it to the refactored method
            await saveManager.saveGame('slot1', saveData);

            // The assertion remains the same
            expect(mockEventBus.emit).toHaveBeenCalledWith('save.failed', {slotId: 'slot1', error});
        });
    });

    describe('loadGame', () => {
        it('should call deserialize on all registered systems', async () => {
            const mockSaveFile: SaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                currentSceneId: 'scene_2',
                systems: {
                    player: {health: 80}
                }
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            await saveManager.loadGame('slot1');

            expect(mockPlayer.deserialize).toHaveBeenCalledWith({health: 80});
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
            const mockSaveFile: SaveData = {version: '1.0.0', timestamp: 12345, currentSceneId: 's1', systems: {}};
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            await saveManager.loadGame('slot1');

            expect(mockEventBus.emit).toHaveBeenCalledWith('save.loaded', {slotId: 'slot1', timestamp: 12345});
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
                systems: {player: {oldHealth: 100}} // Old data
            };
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(JSON.stringify(mockSaveFile));

            // Create a *real* migration function for the registry
            const migrationV1toV2 = vi.fn((data: any) => {
                data.systems.player.health = data.systems.player.oldHealth;
                delete data.systems.player.oldHealth;
                return data;
            });
            mockRegistry.registerMigration('1.0.0_to_1.1.0', migrationV1toV2);
            const mockTimerProvider = {
                setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
                clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
                now: () => Date.now()
            };

            // Re-create saveManager to pick up the new migration function
            saveManager = new SaveManager(mockEventBus, mockRegistry, mockStorageAdapter, mockTimerProvider, mockLogger);

            await saveManager.loadGame('slot1');

            // Check that the *migrated* data was passed to deserialize
            expect(mockPlayer.deserialize).toHaveBeenCalledWith({health: 100});
        });
    });

    describe('Map and Set serialization', () => {
        it('should serialize and deserialize a Map', async () => {
            const inventoryMap = new Map([
                ['potion', 5],
                ['sword', 1],
            ]);

            const mockInventorySystem: ISerializable = {
                serialize: vi.fn(() => ({items: inventoryMap})),
                deserialize: vi.fn(),
            };

            mockRegistry.registerSerializable('inventory', mockInventorySystem);

            // Save
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);
            // (NEW) Step 1: Get a valid SaveData object
            const saveData = saveManager.serializeGameState();

            // (MODIFIED) Step 2: Pass it to the refactored method
            await saveManager.saveGame('slot1', saveData);

            // Get the JSON that was saved
            const savedJson = vi.mocked(mockStorageAdapter.save).mock.calls[0][1];
            const parsedSave = JSON.parse(savedJson);

            // Verify Map was converted to tagged format
            expect(parsedSave.systems.inventory.items).toEqual({
                $type: 'Map',
                value: [['potion', 5], ['sword', 1]]
            });

            // Load
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(savedJson);
            await saveManager.loadGame('slot1');

            // Verify deserialize received actual Map instance
            const deserializedData = vi.mocked(mockInventorySystem.deserialize).mock.calls[0][0] as any;
            expect(deserializedData.items).toBeInstanceOf(Map);
            expect(deserializedData.items.get('potion')).toBe(5);
            expect(deserializedData.items.get('sword')).toBe(1);
        });

        it('should serialize and deserialize a Set', async () => {
            const flagsSet = new Set(['tutorial_complete', 'boss_defeated']);

            const mockFlagsSystem: ISerializable = {
                serialize: vi.fn(() => ({flags: flagsSet})),
                deserialize: vi.fn(),
            };

            mockRegistry.registerSerializable('flags', mockFlagsSystem);

            // Save
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);
            const saveData = saveManager.serializeGameState();
            await saveManager.saveGame('slot1', saveData);

            // Get the JSON that was saved
            const savedJson = vi.mocked(mockStorageAdapter.save).mock.calls[0][1];
            const parsedSave = JSON.parse(savedJson);

            // Verify Set was converted to tagged format
            expect(parsedSave.systems.flags.flags).toEqual({
                $type: 'Set',
                value: ['tutorial_complete', 'boss_defeated']
            });

            // Load
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(savedJson);
            await saveManager.loadGame('slot1');

            // Verify deserialize received actual Set instance
            const deserializedData = vi.mocked(mockFlagsSystem.deserialize).mock.calls[0][0] as any;
            expect(deserializedData.flags).toBeInstanceOf(Set);
            expect(deserializedData.flags.has('tutorial_complete')).toBe(true);
            expect(deserializedData.flags.has('boss_defeated')).toBe(true);
        });

        it('should handle nested Maps and Sets', async () => {
            const complexData = {
                playerStats: new Map([
                    ['strength', 10],
                    ['dexterity', 15],
                ]),
                achievements: new Set(['first_kill', 'level_10']),
                nested: {
                    innerMap: new Map([['key', 'value']])
                }
            };

            const mockComplexSystem: ISerializable = {
                serialize: vi.fn(() => complexData),
                deserialize: vi.fn(),
            };

            mockRegistry.registerSerializable('complex', mockComplexSystem);

            // Save and load
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);
            const saveData = saveManager.serializeGameState();

            await saveManager.saveGame('slot1', saveData);

            const savedJson = vi.mocked(mockStorageAdapter.save).mock.calls[0][1];
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(savedJson);
            await saveManager.loadGame('slot1');

            // Verify all Maps/Sets were restored correctly
            const deserializedData = vi.mocked(mockComplexSystem.deserialize).mock.calls[0][0] as any;
            expect(deserializedData.playerStats).toBeInstanceOf(Map);
            expect(deserializedData.playerStats.get('strength')).toBe(10);
            expect(deserializedData.achievements).toBeInstanceOf(Set);
            expect(deserializedData.achievements.has('first_kill')).toBe(true);
            expect(deserializedData.nested.innerMap).toBeInstanceOf(Map);
            expect(deserializedData.nested.innerMap.get('key')).toBe('value');
        });

        it('should handle plain objects without corrupting them', async () => {
            const plainData = {
                name: 'Player',
                score: 1000,
                items: ['sword', 'shield'],
                config: {difficulty: 'hard'}
            };

            const mockPlainSystem: ISerializable = {
                serialize: vi.fn(() => plainData),
                deserialize: vi.fn(),
            };

            mockRegistry.registerSerializable('plain', mockPlainSystem);

            // Save and load
            vi.mocked(mockStorageAdapter.save).mockResolvedValue(true);
            const saveData = saveManager.serializeGameState();

            await saveManager.saveGame('slot1', saveData);

            const savedJson = vi.mocked(mockStorageAdapter.save).mock.calls[0][1];
            vi.mocked(mockStorageAdapter.load).mockResolvedValue(savedJson);
            await saveManager.loadGame('slot1');

            // Verify plain data was not corrupted
            const deserializedData = vi.mocked(mockPlainSystem.deserialize).mock.calls[0][0] as any;
            expect(deserializedData).toEqual(plainData);
            expect(Array.isArray(deserializedData.items)).toBe(true);
        });
    });

});