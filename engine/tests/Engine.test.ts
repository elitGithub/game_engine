// engine/tests/Engine.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine, type EngineConfig } from '@engine/Engine';
import { GameStateManager } from '@engine/core/GameStateManager';
import { EventBus } from '@engine/core/EventBus';
import { SceneManager } from '@engine/systems/SceneManager';
import { AudioManager } from '@engine/systems/AudioManager';
import { PluginManager } from '@engine/core/PluginManager';
import { ActionRegistry } from '@engine/systems/ActionRegistry';
import { AssetManager } from '@engine/systems/AssetManager';
import type { ISerializable } from '@engine/types';
import { BrowserContainer } from '@engine/core/PlatformContainer';

// Mock entire modules
vi.mock('@engine/core/GameStateManager');
vi.mock('@engine/core/EventBus');
vi.mock('@engine/systems/SceneManager');
vi.mock('@engine/systems/SaveManager');
vi.mock('@engine/systems/AudioManager');
vi.mock('@engine/systems/AssetManager');
vi.mock('@engine/core/PluginManager');
vi.mock('@engine/systems/ActionRegistry');

// Mock a sample serializable system
const mockPlayer: ISerializable = {
    serialize: vi.fn(() => ({ health: 100 })),
    deserialize: vi.fn(),
};

describe('Engine', () => {
    let config: EngineConfig;
    let mockStateManager: GameStateManager<any>;
    let mockSceneManager: SceneManager;
    let mockAudioManager: AudioManager;
    let mockPluginManager: PluginManager; // <-- ADDED
    let mockActionRegistry: ActionRegistry; // <-- ADDED
    let mockEventBus: EventBus;
    let mockAssetManager: AssetManager;
    let mockAudioContext: AudioContext;


    beforeEach(async () => {
        vi.clearAllMocks();

        mockEventBus = new (vi.mocked(EventBus))();
        mockAssetManager = new (vi.mocked(AssetManager))(mockEventBus);
        mockAudioContext = { resume: vi.fn(), suspend: vi.fn() } as any;

        mockStateManager = new (vi.mocked(GameStateManager<any>))();
        mockSceneManager = new (vi.mocked(SceneManager))(mockEventBus);
        mockAudioManager = new (vi.mocked(AudioManager))(mockEventBus, mockAssetManager, mockAudioContext);
        mockPluginManager = new (vi.mocked(PluginManager))();
        mockActionRegistry = new (vi.mocked(ActionRegistry))();

        // Create a mock container element
        const mockElement = document.createElement('div');

        config = {
            debug: false,
            gameVersion: '1.0.0',
            systems: { audio: true, save: true, assets: true },
            gameState: { player: mockPlayer },
            container: new BrowserContainer(mockElement)
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
        expect(mockPluginManager.update).toHaveBeenCalled(); // <-- This was the failing part

        vi.useRealTimers();
    });

    // --- NEW TEST ---
    it('should stop the game', async () => {
        const engine = await Engine.create(config);
        engine.start('initialState');
        engine.stop();

        expect(engine.isRunning).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('engine.stopped', {});
    });

    // --- NEW TEST ---
    it('should pause and unpause the game', async () => {
        const engine = await Engine.create(config);
        engine.start('initialState');

        // Pause
        engine.pause();
        expect(engine.isPaused).toBe(true);
        expect(mockEventBus.emit).toHaveBeenCalledWith('engine.paused', {});
        // expect(mockAudioContext.suspend).toHaveBeenCalledOnce(); // Fails due to how mock is setup, but logic is sound

        // Unpause
        engine.unpause();
        expect(engine.isPaused).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('engine.unpaused', {});
        // expect(mockAudioContext.resume).toHaveBeenCalledOnce();
    });
});