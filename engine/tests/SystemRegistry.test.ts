// engine/tests/SystemRegistry.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemRegistry, SYSTEMS, createSystemKey } from '@engine/core/SystemRegistry';
import type { IRenderer } from '@engine/types/RenderingTypes';

describe('SystemRegistry', () => {
    let registry: SystemRegistry;
    const mockSystem = { id: 'test' };

    // Mock renderer
    const mockRenderer: IRenderer = {
        init: vi.fn(),
        clear: vi.fn(),
        flush: vi.fn(),
        dispose: vi.fn(),
    };

    beforeEach(() => {
        registry = new SystemRegistry();
    });

    it('should register and check for a system', () => {
        registry.register(SYSTEMS.EventBus, mockSystem);
        expect(registry.has(SYSTEMS.EventBus)).toBe(true);
        expect(registry.has(SYSTEMS.ActionRegistry)).toBe(false);
    });

    it('should get a registered system', () => {
        registry.register(SYSTEMS.EventBus, mockSystem);
        expect(registry.get(SYSTEMS.EventBus)).toBe(mockSystem);
    });

    it('should throw when getting a non-existent system', () => {
        expect(() => registry.get(SYSTEMS.EventBus)).toThrow(
            '[SystemRegistry] System not found: EventBus'
        );
    });

    it('should get an optional system', () => {
        registry.register(SYSTEMS.EventBus, mockSystem);
        expect(registry.getOptional(SYSTEMS.EventBus)).toBe(mockSystem);
        expect(registry.getOptional(SYSTEMS.ActionRegistry)).toBeUndefined();
    });

    it('should unregister a system', () => {
        registry.register(SYSTEMS.EventBus, mockSystem);
        expect(registry.has(SYSTEMS.EventBus)).toBe(true);
        const success = registry.unregister(SYSTEMS.EventBus);
        expect(success).toBe(true);
        expect(registry.has(SYSTEMS.EventBus)).toBe(false);
    });

    it('should clear all systems', () => {
        registry.register(SYSTEMS.EventBus, mockSystem);
        registry.clear();
        expect(registry.has(SYSTEMS.EventBus)).toBe(false);
    });

    it('should register and get a renderer', () => {
        registry.registerRenderer('dom', mockRenderer);
        expect(registry.getRenderer('dom')).toBe(mockRenderer);
    });

    it('should throw when getting a non-existent renderer', () => {
        expect(() => registry.getRenderer('canvas')).toThrow(
            '[SystemRegistry] Renderer not found: canvas'
        );
    });

    it('should support custom system keys', () => {
        const CustomSystem = createSystemKey('CustomSystem');
        const customInstance = { name: 'custom' };

        registry.register(CustomSystem, customInstance);
        expect(registry.has(CustomSystem)).toBe(true);
        expect(registry.get(CustomSystem)).toBe(customInstance);
    });
});