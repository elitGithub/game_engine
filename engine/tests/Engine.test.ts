// engine/tests/Engine.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Engine, type EngineConfig } from '@engine/Engine';
import { GameStateManager } from '@engine/core/GameStateManager';
import { EventBus } from '@engine/core/EventBus';
import { SystemFactory } from '@engine/core/SystemFactory';
import { SceneManager } from '@engine/systems/SceneManager';
import { SaveManager } from '@engine/systems/SaveManager';
import { AudioManager } from '@engine/systems/AudioManager';
// --- FIX: Import AssetManager for mocking ---
import { AssetManager } from '@engine/systems/AssetManager';
import type { ISerializable } from '@engine/types';

// Mock entire modules
vi.mock('@engine/core/GameStateManager');
vi.mock('@engine/core/EventBus');
vi.mock('@engine/core/SystemFactory');
vi.mock('@engine/systems/SceneManager');
vi.mock('@engine/systems/SaveManager');
vi.mock('@engine/systems/AudioManager');
// --- FIX: Mock AssetManager ---
vi.mock('@engine/systems/AssetManager');

// Mock a sample serializable system
const mockPlayer: ISerializable = {
    serialize: vi.fn(() => ({ health: 100 })),
    deserialize: vi.fn(),
};

describe('Engine', () => {
    let config: EngineConfig<{ player: ISerializable }>;
    // --- FIX: Add <any> generic ---
    let mockStateManager: GameStateManager<any>;
    let mockSceneManager: SceneManager;
    let mockAudioManager: AudioManager;
    // --- FIX: Add mocks for constructor args ---
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: AudioContext;


    beforeEach(async () => {
        vi.clearAllMocks();

        // --- FIX: Create mock instances for constructor args ---
        mockEventBus = new (vi.mocked(EventBus))();
        mockAssetManager = new (vi.mocked(AssetManager))(mockEventBus); // AssetManager needs an EventBus
        mockAudioContext = { resume: vi.fn() } as any; // Simple mock for AudioContext

        // --- FIX: Provide args to mock constructors and add generic ---
        mockStateManager = new (vi.mocked(GameStateManager<any>))();
        mockSceneManager = new (vi.mocked(SceneManager))(mockEventBus);
        mockAudioManager = new (vi.mocked(AudioManager))(mockEventBus, mockAssetManager, mockAudioContext);

        // Mock SystemFactory.create to *not* do anything,
        // but mock the registry to *return* our mocks
        vi.mocked(SystemFactory.create).mockImplementation((config, registry) => {
            // --- FIX: Use the instances we created above ---
            registry.register('EventBus' as any, mockEventBus);
            registry.register('StateManager' as any, mockStateManager);
            registry.register('SceneManager' as any, mockSceneManager);
            if (config.audio) {
                registry.register('AudioManager' as any, mockAudioManager);
            }
        });

        config = {
            debug: false,
            gameVersion: '1.0.0',
            systems: { audio: true, save: true, assets: true },
            gameState: { player: mockPlayer },
        };
    });

    it('should be created via static async factory Engine.create', async () => {
        const engine = await Engine.create(config);
        expect(engine).toBeInstanceOf(Engine);
        expect(engine.context.game.player).toBe(mockPlayer);
        expect(SystemFactory.create).toHaveBeenCalledOnce();
    });

    it('should unlock audio if AudioManager is present', async () => {
        await Engine.create(config);
        expect(mockAudioManager.unlockAudio).toHaveBeenCalledOnce();
    });

    it('should NOT unlock audio if AudioManager is disabled', async () => {
        config.systems.audio = false;
        await Engine.create(config);
        expect(mockAudioManager.unlockAudio).not.toHaveBeenCalled();
    });

    it('should register core engine state as serializable', async () => {
        const engine = await Engine.create(config);
        const coreSerializable = engine.serializableSystems.get('_core');
        expect(coreSerializable).toBeDefined();

        engine.context.flags.add('test_flag');
        engine.context.variables.set('test_var', 123);

        const serialized = coreSerializable?.serialize();
        expect(serialized).toEqual({
            flags: ['test_flag'],
            variables: [['test_var', 123]],
        });

        const newEngine = await Engine.create(config);
        const newCore = newEngine.serializableSystems.get('_core');
        newCore?.deserialize(serialized);

        expect(newEngine.context.flags.has('test_flag')).toBe(true);
        expect(newEngine.context.variables.get('test_var')).toBe(123);
    });

    it('should register and return serializable systems', async () => {
        const engine = await Engine.create(config);
        engine.registerSerializableSystem('player', mockPlayer);
        expect(engine.serializableSystems.get('player')).toBe(mockPlayer);
    });

    it('should implement ISerializationRegistry: getCurrentSceneId', async () => {
        vi.mocked(mockSceneManager.getCurrentScene).mockReturnValue({ sceneId: 'current_scene' } as any);
        const engine = await Engine.create(config);
        expect(engine.getCurrentSceneId()).toBe('current_scene');
    });

    it('should implement ISerializationRegistry: restoreScene', async () => {
        const engine = await Engine.create(config);
        engine.restoreScene('scene_to_load');
        expect(mockSceneManager.goToScene).toHaveBeenCalledWith('scene_to_load', engine.context);
    });

    it('should start the game and change to initial state', async () => {
        vi.useFakeTimers();
        const engine = await Engine.create(config);
        engine.start('initialState');

        expect(engine.isRunning).toBe(true);
        expect(mockStateManager.changeState).toHaveBeenCalledWith('initialState', {});

        vi.advanceTimersByTime(1000); // Emulate game loop
        expect(mockStateManager.update).toHaveBeenCalled();

        vi.useRealTimers();
    });
});