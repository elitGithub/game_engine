// engine/tests/SceneManager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SceneManager } from '@engine/systems/SceneManager';
import { Scene } from '@engine/systems/Scene';
import { EventBus } from '@engine/core/EventBus';
import type { GameContext } from '@engine/types';
import type { ScenesDataMap, SceneChoice } from '@engine/types/EngineEventMap';
import {ILogger} from "@engine/interfaces";

// Mock dependencies
vi.mock('@engine/core/EventBus');

// Create a mock Scene class to spy on its methods
class MockScene extends Scene {
    onEnter = vi.fn();
    onExit = vi.fn();
    getChoices = vi.fn((): SceneChoice[] => []);
}


const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
describe('SceneManager', () => {
    let sceneManager: SceneManager;
    let mockEventBus: EventBus;
    let mockContext: GameContext;

    const scenesData: ScenesDataMap = {
        'start': { text: 'Start scene', sceneType: 'story' },
        'middle': { text: 'Middle scene', sceneType: 'story' },
        'end': { text: 'End scene', sceneType: 'story' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockEventBus = new (vi.mocked(EventBus))(mockLogger);
        sceneManager = new SceneManager(mockEventBus);
        mockContext = {
            game: {},
            flags: new Set(),
            variables: new Map()
        };

        // Register a custom factory to use our MockScene
        sceneManager.registerSceneFactory('story', (id: string, type: string, data: any) => {
            return new MockScene(id, type, data);
        });

        sceneManager.loadScenes(scenesData);
    });

    it('should load scenes using the factory', () => {
        expect(sceneManager.getScene('start')).toBeInstanceOf(MockScene);
        expect(sceneManager.getScene('start')?.sceneType).toBe('story');
    });

    it('should return null for a non-existent scene', () => {
        expect(sceneManager.getScene('unknown')).toBeNull();
    });

    it('should go to a scene, emitting events and calling hooks', () => {
        const startScene = sceneManager.getScene('start') as MockScene;

        const success = sceneManager.goToScene('start', mockContext);

        expect(success).toBe(true);
        expect(sceneManager.getCurrentScene()).toBe(startScene);
        expect(startScene.onEnter).toHaveBeenCalledWith(mockContext);
        // --- FIX: Expect 'story' type ---
        expect(mockEventBus.emit).toHaveBeenCalledWith('scene.changed', {
            sceneId: 'start',
            type: 'story',
            previousScene: null
        });
    });

    it('should call onExit on the previous scene when changing scenes', () => {
        const startScene = sceneManager.getScene('start') as MockScene;
        const middleScene = sceneManager.getScene('middle') as MockScene;

        sceneManager.goToScene('start', mockContext);
        vi.clearAllMocks();

        sceneManager.goToScene('middle', mockContext);

        expect(startScene.onExit).toHaveBeenCalledWith(mockContext);
        expect(middleScene.onEnter).toHaveBeenCalledWith(mockContext);
        expect(sceneManager.getCurrentScene()).toBe(middleScene);
        // --- FIX: Expect 'story' type ---
        expect(mockEventBus.emit).toHaveBeenCalledWith('scene.changed', {
            sceneId: 'middle',
            type: 'story',
            previousScene: 'start'
        });
    });

    it('should return false if trying to go to a scene that does not exist', () => {
        const success = sceneManager.goToScene('unknown', mockContext);
        expect(success).toBe(false);
        expect(mockEventBus.emit).not.toHaveBeenCalledWith('scene.changed', expect.any(Object));
    });

    it('should go back to the previous scene', () => {
        const startScene = sceneManager.getScene('start') as MockScene;
        const middleScene = sceneManager.getScene('middle') as MockScene;

        sceneManager.goToScene('start', mockContext);
        sceneManager.goToScene('middle', mockContext);

        expect(sceneManager.getCurrentScene()).toBe(middleScene);

        vi.clearAllMocks();
        const success = sceneManager.goBack(mockContext);

        expect(success).toBe(true);
        expect(middleScene.onExit).toHaveBeenCalledWith(mockContext);
        expect(startScene.onEnter).toHaveBeenCalledWith(mockContext);
        expect(sceneManager.getCurrentScene()).toBe(startScene);
        // --- FIX: Expect 'story' type and correct previousScene ---
        expect(mockEventBus.emit).toHaveBeenCalledWith('scene.changed', {
            sceneId: 'start',
            type: 'story',
            previousScene: null
        });
    });

    // --- FIX: This test now passes because the underlying bug is fixed ---
    it('should not go back if history is empty', () => {
        sceneManager.goToScene('start', mockContext); // history = []

        const success1 = sceneManager.goBack(mockContext); // history = [], returns false
        expect(success1).toBe(false);

        sceneManager.goToScene('middle', mockContext); // history = ['start']
        const success2 = sceneManager.goBack(mockContext); // history = [], returns true
        expect(success2).toBe(true);

        const success3 = sceneManager.goBack(mockContext); // history = [], returns false
        expect(success3).toBe(false); // This will now pass!
    });

    it('should get choices from the current scene', () => {
        const middleScene = sceneManager.getScene('middle') as MockScene;
        const mockChoices: SceneChoice[] = [{ textKey: 'choice1' }];
        middleScene.getChoices.mockReturnValue(mockChoices);

        sceneManager.goToScene('middle', mockContext);

        const choices = sceneManager.getCurrentChoices(mockContext);
        expect(choices).toBe(mockChoices);
        expect(middleScene.getChoices).toHaveBeenCalledWith(mockContext);
    });
});