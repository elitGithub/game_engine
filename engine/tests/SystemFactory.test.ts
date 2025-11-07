// engine/tests/SystemFactory.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemFactory } from '@engine/core/SystemFactory';
import { SystemRegistry, SYSTEMS } from '@engine/core/SystemRegistry';
import { EventBus } from '@engine/core/EventBus';
import { GameStateManager } from '@engine/core/GameStateManager';
import { SceneManager } from '@engine/systems/SceneManager';
import { ActionRegistry } from '@engine/systems/ActionRegistry';
import { PluginManager } from '@engine/core/PluginManager';
import { AssetManager } from '@engine/systems/AssetManager';
import { AudioManager } from '@engine/systems/AudioManager';
import { EffectManager } from '@engine/systems/EffectManager';
import { RenderManager } from '@engine/core/RenderManager';
import { InputManager } from '@engine/systems/InputManager';
import { DomInputAdapter } from '@engine/core/DomInputAdapter';
// --- FIX: Corrected the import paths ---
import type { SystemConfig } from '@engine/core/SystemFactory';
import type { PlatformContainer } from '@engine/core/PlatformContainer';
// ---

// Mock all dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/core/GameStateManager');
vi.mock('@engine/systems/SceneManager');
vi.mock('@engine/systems/ActionRegistry');
vi.mock('@engine/core/PluginManager');
vi.mock('@engine/systems/AssetManager');
vi.mock('@engine/systems/AudioManager');
vi.mock('@engine/systems/EffectManager');
vi.mock('@engine/core/RenderManager');
vi.mock('@engine/systems/InputManager');
vi.mock('@engine/core/DomInputAdapter');
vi.mock('@engine/rendering/DomRenderer');
vi.mock('@engine/rendering/CanvasRenderer');

// Mock browser AudioContext
const MockAudioContext = vi.fn(() => ({
    createGain: vi.fn(),
}));
vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);


describe('SystemFactory', () => {
    let registry: SystemRegistry;
    let mockContainer: PlatformContainer;
    let mockDomElement: HTMLElement;

    beforeEach(() => {
        vi.clearAllMocks();
        registry = new SystemRegistry();
        mockDomElement = document.createElement('div');
        mockContainer = {
            getDomElement: vi.fn(() => mockDomElement),
        };
    });

    // ... (rest of the test file is correct) ...
    it('should create all core systems', () => {
        const config: SystemConfig = {};
        SystemFactory.create(config, registry);

        expect(registry.has(SYSTEMS.EventBus)).toBe(true);
        expect(registry.has(SYSTEMS.StateManager)).toBe(true);
        expect(registry.has(SYSTEMS.SceneManager)).toBe(true);
        expect(registry.has(SYSTEMS.ActionRegistry)).toBe(true);
        expect(registry.has(SYSTEMS.PluginManager)).toBe(true);

        expect(vi.mocked(EventBus)).toHaveBeenCalledOnce();
        expect(vi.mocked(GameStateManager)).toHaveBeenCalledOnce();
        expect(vi.mocked(SceneManager)).toHaveBeenCalledOnce();
        expect(vi.mocked(ActionRegistry)).toHaveBeenCalledOnce();
        expect(vi.mocked(PluginManager)).toHaveBeenCalledOnce();
    });

    it('should create AssetManager if config.assets is true', () => {
        const config: SystemConfig = { assets: true };
        SystemFactory.create(config, registry);

        expect(registry.has(SYSTEMS.AssetManager)).toBe(true);
        expect(vi.mocked(AssetManager)).toHaveBeenCalledOnce();
    });

    it('should create AudioManager if config.audio is true', () => {
        const config: SystemConfig = { assets: true, audio: true };
        SystemFactory.create(config, registry);

        expect(registry.has(SYSTEMS.AudioManager)).toBe(true);
        expect(vi.mocked(AudioManager)).toHaveBeenCalledOnce();
    });

    it('should throw if AudioManager is enabled but AssetManager is not', () => {
        const config: SystemConfig = { assets: false, audio: true };
        expect(() => SystemFactory.create(config, registry)).toThrow('AudioManager requires AssetManager');
    });

    it('should create EffectManager if config.effects is true and container is provided', () => {
        const config: SystemConfig = { effects: true };
        SystemFactory.create(config, registry, mockContainer);

        expect(registry.has(SYSTEMS.EffectManager)).toBe(true);
        expect(vi.mocked(EffectManager)).toHaveBeenCalledWith(mockDomElement);
    });

    it('should create RenderManager if config.renderer is set and container is provided', () => {
        const config: SystemConfig = { assets: true, renderer: { type: 'dom' } };
        SystemFactory.create(config, registry, mockContainer);

        expect(registry.has(SYSTEMS.RenderManager)).toBe(true);
        expect(vi.mocked(RenderManager)).toHaveBeenCalledOnce();
    });

    it('should throw if RenderManager is enabled but AssetManager is not', () => {
        const config: SystemConfig = { assets: false, renderer: { type: 'dom' } };
        expect(() => SystemFactory.create(config, registry, mockContainer)).toThrow('Renderer requires AssetManager');
    });

    it('should create InputManager if config.input is true', () => {
        const config: SystemConfig = { input: true };
        SystemFactory.create(config, registry, mockContainer);

        expect(registry.has(SYSTEMS.InputManager)).toBe(true);
        expect(vi.mocked(InputManager)).toHaveBeenCalledOnce();
        // Check that the adapter was created and attached
        expect(vi.mocked(DomInputAdapter)).toHaveBeenCalledOnce();
        const adapterInstance = vi.mocked(DomInputAdapter).mock.instances[0];
        expect(adapterInstance.attachToContainer).toHaveBeenCalledWith(mockContainer, { tabindex: '0' });
    });

    it('should not create optional systems if config is false', () => {
        const config: SystemConfig = {
            assets: false,
            audio: false,
            effects: false,
            input: false,
            save: false
        };
        SystemFactory.create(config, registry);

        expect(registry.has(SYSTEMS.AssetManager)).toBe(false);
        expect(registry.has(SYSTEMS.AudioManager)).toBe(false);
        expect(registry.has(SYSTEMS.EffectManager)).toBe(false);
        expect(registry.has(SYSTEMS.InputManager)).toBe(false);
    });
});