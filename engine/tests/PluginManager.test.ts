// engine/tests/PluginManager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '@engine/core/PluginManager';
import type { IEngineHost, IEnginePlugin, GameContext } from '@engine/types';

// Create mock plugins
const mockPluginA: IEnginePlugin = {
    name: 'pluginA',
    install: vi.fn(),
    uninstall: vi.fn(),
    update: vi.fn()
};

const mockPluginB: IEnginePlugin = {
    name: 'pluginB',
    install: vi.fn(),
    uninstall: vi.fn(),
    update: vi.fn()
};

// --- FIX: Create a valid mock context ---
const mockContext: GameContext = {
    game: {},
    flags: new Set(),
    variables: new Map()
};

// Create a mock engine host
const mockHost: IEngineHost = {
    context: mockContext, // <-- Use the valid mock context
    eventBus: null as any,
    registerSerializableSystem: vi.fn()
};

describe('PluginManager', () => {
    let pluginManager: PluginManager;

    beforeEach(() => {
        vi.clearAllMocks();
        pluginManager = new PluginManager();
    });

    it('should register a plugin', () => {
        pluginManager.register(mockPluginA);
        expect(pluginManager.getAvailable()).toContain('pluginA');
    });

    it('should install a registered plugin', () => {
        pluginManager.register(mockPluginA);
        const success = pluginManager.install('pluginA', mockHost);

        expect(success).toBe(true);
        expect(mockPluginA.install).toHaveBeenCalledWith(mockHost);
        expect(pluginManager.isInstalled('pluginA')).toBe(true);
        expect(pluginManager.getInstalled()).toContain('pluginA');
    });

    it('should not install an unregistered plugin', () => {
        const success = pluginManager.install('pluginA', mockHost);
        expect(success).toBe(false);
        expect(mockPluginA.install).not.toHaveBeenCalled();
    });

    it('should not install a plugin twice', () => {
        pluginManager.register(mockPluginA);
        pluginManager.install('pluginA', mockHost);
        const success = pluginManager.install('pluginA', mockHost);

        expect(success).toBe(false);
        expect(mockPluginA.install).toHaveBeenCalledTimes(1);
    });

    it('should uninstall an installed plugin', () => {
        pluginManager.register(mockPluginA);
        pluginManager.install('pluginA', mockHost);

        const success = pluginManager.uninstall('pluginA', mockHost);

        expect(success).toBe(true);
        expect(mockPluginA.uninstall).toHaveBeenCalledWith(mockHost);
        expect(pluginManager.isInstalled('pluginA')).toBe(false);
    });

    it('should not uninstall a plugin that is not installed', () => {
        pluginManager.register(mockPluginA);
        const success = pluginManager.uninstall('pluginA', mockHost);

        expect(success).toBe(false);
        expect(mockPluginA.uninstall).not.toHaveBeenCalled();
    });

    it('should call update on all installed plugins', () => {
        pluginManager.register(mockPluginA);
        pluginManager.register(mockPluginB);

        pluginManager.install('pluginA', mockHost);
        // pluginB is registered but not installed

        // --- FIX: Pass the valid mock context ---
        pluginManager.update(0.16, mockHost.context);

        expect(mockPluginA.update).toHaveBeenCalledWith(0.16, mockHost.context);
        expect(mockPluginB.update).not.toHaveBeenCalled();
    });
});