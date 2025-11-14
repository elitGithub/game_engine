// engine/tests/Engine.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine, type EngineConfig } from '@engine/Engine';
import type { ISerializable } from '@engine/types';
import { GameState } from '@engine/core/GameState';
import { Scene } from '@engine/systems/Scene';
import type {ILogger} from "@engine/interfaces";
import { HeadlessPlatformAdapter } from '@engine/platform/HeadlessPlatformAdapter';

// Mock a sample serializable system
const mockPlayer: ISerializable = {
    serialize: vi.fn(() => ({ health: 100 })),
    deserialize: vi.fn(),
};

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};


// Test state for testing
class TestState extends GameState {
    public enterFn = vi.fn();
    public updateFn = vi.fn();
    public exitFn = vi.fn();
    public handleEventFn = vi.fn();

    constructor(name: string, logger: ILogger) {
        super(name, logger);
    }

    enter(data: any): void {
        super.enter(data);
        this.enterFn(data);
    }

    update(deltaTime: number): void {
        this.updateFn(deltaTime);
    }

    exit(): void {
        super.exit();
        this.exitFn();
    }

    handleEvent(event: any): void {
        this.handleEventFn(event);
    }
}

describe('Engine', () => {
    let config: EngineConfig;
    let platform: HeadlessPlatformAdapter;

    beforeEach(() => {
        vi.clearAllMocks();

        platform = new HeadlessPlatformAdapter();

        config = {
            debug: false,
            gameVersion: '1.0.0',
            platform, // Provide platform adapter
            systems: { audio: false, save: true, assets: true }, // Headless platform doesn't support audio
            gameState: { player: mockPlayer },
        };
    });

    it('should be created via static async factory Engine.create', async () => {
        const engine = new Engine(config);
        expect(engine).toBeInstanceOf(Engine);
        expect(engine.context.game.player).toBe(mockPlayer);
    });

    it.skip('should unlock audio if AudioManager is present', async () => {
        // Skip: HeadlessPlatformAdapter doesn't support audio
        // Audio functionality is tested separately in AudioManager.test.ts
    });

    it('should NOT unlock audio if AudioManager is disabled', async () => {
        config.systems = config.systems ?? {};
        config.systems.audio = false;
        const engine = new Engine(config);

        // audio getter should throw or return undefined when disabled
        expect(() => engine.audio).toThrow();
    });

    it('should register core engine state as serializable', async () => {
        const engine = new Engine(config);
        const coreSerializable = engine.serializableSystems.get('_core');
        expect(coreSerializable).toBeDefined();

        engine.context.flags.add('test_flag');
        engine.context.variables.set('test_var', 123);

        const serialized = coreSerializable?.serialize();
        expect(serialized).toEqual({
            flags: ['test_flag'],
            variables: [['test_var', 123]],
        });

        const newEngine = new Engine(config);
        const newCore = newEngine.serializableSystems.get('_core');
        newCore?.deserialize(serialized);

        expect(newEngine.context.flags.has('test_flag')).toBe(true);
        expect(newEngine.context.variables.get('test_var')).toBe(123);
    });

    it('should register and return serializable systems', async () => {
        const engine = new Engine(config);
        engine.registerSerializableSystem('player', mockPlayer);
        expect(engine.serializableSystems.get('player')).toBe(mockPlayer);
    });

    it('should implement ISerializationRegistry: getCurrentSceneId', async () => {
        const engine = new Engine(config);

        // Register scene factory before loading scenes
        engine.sceneManager.registerSceneFactory('story', (id, type, data) => new Scene(id, type, data));

        // Register a scene and navigate to it
        engine.sceneManager.loadScenes({
            test_scene: {
                sceneType: 'story',
                background: { image: 'bg.png' },
                characters: [],
                lines: []
            }
        });

        engine.sceneManager.goToScene('test_scene', engine.context);

        expect(engine.getCurrentSceneId()).toBe('test_scene');
    });

    it('should implement ISerializationRegistry: restoreScene', async () => {
        const engine = new Engine(config);

        // Register scene factory before loading scenes
        engine.sceneManager.registerSceneFactory('story', (id, type, data) => new Scene(id, type, data));

        // Register a scene
        engine.sceneManager.loadScenes({
            scene_to_load: {
                sceneType: 'story',
                background: { image: 'bg.png' },
                characters: [],
                lines: []
            }
        });

        // Spy on goToScene
        const goToSceneSpy = vi.spyOn(engine.sceneManager, 'goToScene');

        engine.restoreScene('scene_to_load');

        expect(goToSceneSpy).toHaveBeenCalledWith('scene_to_load', engine.context);
    });

    it('should start the game and change to initial state', async () => {
        vi.useFakeTimers();
        const engine = new Engine(config);

        // Register a state
        const testState = new TestState('initialState', mockLogger);
        engine.stateManager.register('initialState', testState);

        // Spy on state manager and plugin manager
        const changeStateSpy = vi.spyOn(engine.stateManager, 'changeState');
        const stateUpdateSpy = vi.spyOn(engine.stateManager, 'update');
        const pluginUpdateSpy = vi.spyOn(engine.pluginManager, 'update');

        engine.start('initialState');

        expect(engine.isRunning).toBe(true);
        expect(changeStateSpy).toHaveBeenCalledWith('initialState', {});

        vi.advanceTimersByTime(1000); // Emulate game loop
        expect(stateUpdateSpy).toHaveBeenCalled();
        expect(pluginUpdateSpy).toHaveBeenCalled();

        vi.useRealTimers();
    });

    it('should stop the game', async () => {
        const engine = new Engine(config);

        // Register a state
        const testState = new TestState('initialState', mockLogger);
        engine.stateManager.register('initialState', testState);

        // Spy on event bus
        const emitSpy = vi.spyOn(engine.eventBus, 'emit');

        engine.start('initialState');
        engine.stop();

        expect(engine.isRunning).toBe(false);
        expect(emitSpy).toHaveBeenCalledWith('engine.stopped', {});
    });

    it('should pause and unpause the game', async () => {
        const engine = new Engine(config);

        // Register a state
        const testState = new TestState('initialState', mockLogger);
        engine.stateManager.register('initialState', testState);

        // Spy on event bus
        const emitSpy = vi.spyOn(engine.eventBus, 'emit');

        engine.start('initialState');

        // Pause
        engine.pause();
        expect(engine.isPaused).toBe(true);
        expect(emitSpy).toHaveBeenCalledWith('engine.paused', {});

        // Unpause
        engine.unpause();
        expect(engine.isPaused).toBe(false);
        expect(emitSpy).toHaveBeenCalledWith('engine.unpaused', {});
    });

    it('should clamp deltaTime to prevent physics tunneling', async () => {
        const engine = new Engine(config);

        const testState = new TestState('test', mockLogger);
        const updateSpy = vi.spyOn(testState, 'update');
        engine.stateManager.register('test', testState);

        // Mock performance.now to simulate large time gap
        let timeValue = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => timeValue);

        engine.start('test');

        // First frame at time 0
        timeValue = 0;

        // Manually trigger one loop iteration to set lastFrameTime
        // @ts-ignore - accessing private method for testing
        engine.gameLoop();

        // Simulate 5 second gap (tab lost focus)
        timeValue = 5000;

        // @ts-ignore - accessing private method for testing
        engine.gameLoop();

        // Verify deltaTime was clamped to max (0.1s by default, not 5.0s)
        expect(updateSpy).toHaveBeenCalledWith(0.1);

        engine.stop();
    });

    it('should respect custom maxDeltaTime config', async () => {
        const customConfig = {
            ...config,
            maxDeltaTime: 0.05, // Custom 50ms max
        };
        const engine = new Engine(customConfig);

        const testState = new TestState('test', mockLogger);
        const updateSpy = vi.spyOn(testState, 'update');
        engine.stateManager.register('test', testState);

        // Mock performance.now
        let timeValue = 0;
        vi.spyOn(performance, 'now').mockImplementation(() => timeValue);

        engine.start('test');

        timeValue = 0;
        // @ts-ignore - accessing private method for testing
        engine.gameLoop();

        // Simulate large gap
        timeValue = 2000;
        // @ts-ignore - accessing private method for testing
        engine.gameLoop();

        // Verify deltaTime was clamped to custom max (0.05s, not 2.0s)
        expect(updateSpy).toHaveBeenCalledWith(0.05);

        engine.stop();
    });
});
