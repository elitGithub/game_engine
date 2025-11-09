// engine/tests/SystemContainer.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemContainer, SystemLifecycle, type SystemDefinition } from '@engine/core/SystemContainer';

describe('SystemContainer', () => {
    let container: SystemContainer;

    beforeEach(() => {
        container = new SystemContainer();
    });

    describe('Basic Registration', () => {
        it('should register a system definition', () => {
            const mockSystem = { name: 'test' };
            const definition: SystemDefinition = {
                key: Symbol('Test'),
                factory: () => mockSystem
            };

            container.register(definition);
            expect(container.has(definition.key)).toBe(true);
        });

        it('should register an already-instantiated system', () => {
            const key = Symbol('Test');
            const instance = { name: 'test' };

            container.registerInstance(key, instance);
            expect(container.has(key)).toBe(true);
            expect(container.get(key)).toBe(instance);
        });

        it('should warn when overwriting a registered system', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const key = Symbol('Test');

            container.register({ key, factory: () => ({}) });
            container.register({ key, factory: () => ({}) });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("System 'Symbol(Test)' already registered")
            );

            warnSpy.mockRestore();
        });
    });

    describe('System Retrieval', () => {
        it('should get a registered system instance', () => {
            const mockSystem = { name: 'test' };
            const key = Symbol('Test');

            container.register({
                key,
                factory: () => mockSystem
            });

            const instance = container.get(key);
            expect(instance).toBe(mockSystem);
        });

        it('should throw when getting a non-existent system', () => {
            const key = Symbol('NonExistent');
            expect(() => container.get(key)).toThrow(
                "[SystemContainer] System 'Symbol(NonExistent)' not found"
            );
        });

        it('should return undefined for non-existent optional system', () => {
            const key = Symbol('Optional');
            expect(container.getOptional(key)).toBeUndefined();
        });

        it('should return system for existing optional system', () => {
            const mockSystem = { name: 'optional' };
            const key = Symbol('Optional');

            container.register({
                key,
                factory: () => mockSystem
            });

            expect(container.getOptional(key)).toBe(mockSystem);
        });

        it('should cache system instances (factory called only once)', () => {
            const factory = vi.fn(() => ({ name: 'test' }));
            const key = Symbol('Test');

            container.register({ key, factory });

            container.get(key);
            container.get(key);
            container.get(key);

            expect(factory).toHaveBeenCalledOnce();
        });
    });

    describe('Dependency Resolution', () => {
        it('should resolve dependencies in correct order', () => {
            const eventBusKey = Symbol('EventBus');
            const stateManagerKey = Symbol('StateManager');
            const creationOrder: string[] = [];

            container.register({
                key: eventBusKey,
                factory: () => {
                    creationOrder.push('EventBus');
                    return { name: 'EventBus' };
                }
            });

            container.register({
                key: stateManagerKey,
                dependencies: [eventBusKey],
                factory: (c) => {
                    creationOrder.push('StateManager');
                    const eventBus = c.get(eventBusKey);
                    return { name: 'StateManager', eventBus };
                }
            });

            const stateManager = container.get(stateManagerKey) as any;

            expect(creationOrder).toEqual(['EventBus', 'StateManager']);
            expect(stateManager.eventBus.name).toBe('EventBus');
        });

        it('should throw on missing dependency', () => {
            const key = Symbol('Test');
            const missingDep = Symbol('Missing');

            container.register({
                key,
                dependencies: [missingDep],
                factory: () => ({})
            });

            expect(() => container.get(key)).toThrow(
                "[SystemContainer] Dependency 'Symbol(Missing)' not found"
            );
        });

        it('should detect circular dependencies', () => {
            const keyA = Symbol('A');
            const keyB = Symbol('B');

            container.register({
                key: keyA,
                dependencies: [keyB],
                factory: (c) => ({ b: c.get(keyB) })
            });

            container.register({
                key: keyB,
                dependencies: [keyA],
                factory: (c) => ({ a: c.get(keyA) })
            });

            expect(() => container.get(keyA)).toThrow(
                '[SystemContainer] Circular dependency detected'
            );
        });
    });

    describe('Lazy Loading', () => {
        it('should not create lazy systems during initializeAll', async () => {
            const lazyFactory = vi.fn(() => ({ name: 'lazy' }));
            const eagerFactory = vi.fn(() => ({ name: 'eager' }));

            container.register({
                key: Symbol('Lazy'),
                factory: lazyFactory,
                lazy: true
            });

            container.register({
                key: Symbol('Eager'),
                factory: eagerFactory,
                lazy: false
            });

            await container.initializeAll();

            expect(eagerFactory).toHaveBeenCalledOnce();
            expect(lazyFactory).not.toHaveBeenCalled();
        });

        it('should create lazy system on first access', () => {
            const factory = vi.fn(() => ({ name: 'lazy' }));
            const key = Symbol('Lazy');

            container.register({
                key,
                factory,
                lazy: true
            });

            expect(factory).not.toHaveBeenCalled();

            const instance = container.get(key);

            expect(factory).toHaveBeenCalledOnce();
            expect(instance).toEqual({ name: 'lazy' });
        });
    });

    describe('Lifecycle Management', () => {
        it('should call initialize callback after instantiation', () => {
            const initialize = vi.fn();
            const key = Symbol('Test');

            container.register({
                key,
                factory: () => ({ name: 'test' }),
                initialize
            });

            container.get(key);

            expect(initialize).toHaveBeenCalledOnce();
        });

        it('should support async initialize', async () => {
            const initialize = vi.fn(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });
            const key = Symbol('Test');

            container.register({
                key,
                factory: () => ({ name: 'test' }),
                initialize
            });

            container.get(key);
            await container.initializeAll();

            expect(initialize).toHaveBeenCalledOnce();
        });

        it('should call dispose callback', async () => {
            const dispose = vi.fn();
            const key = Symbol('Test');

            container.register({
                key,
                factory: () => ({ name: 'test' }),
                dispose
            });

            container.get(key);
            await container.dispose(key);

            expect(dispose).toHaveBeenCalledOnce();
        });

        it('should track lifecycle states', () => {
            const key = Symbol('Test');

            container.register({
                key,
                factory: () => ({ name: 'test' })
            });

            expect(container.getLifecycleState(key)).toBe(SystemLifecycle.REGISTERED);

            container.get(key);

            expect(container.getLifecycleState(key)).toBe(SystemLifecycle.READY);
        });

        it('should dispose all systems', async () => {
            const dispose1 = vi.fn();
            const dispose2 = vi.fn();
            const key1 = Symbol('Test1');
            const key2 = Symbol('Test2');

            container.register({
                key: key1,
                factory: () => ({ name: 'test1' }),
                dispose: dispose1
            });

            container.register({
                key: key2,
                factory: () => ({ name: 'test2' }),
                dispose: dispose2
            });

            container.get(key1);
            container.get(key2);

            await container.disposeAll();

            expect(dispose1).toHaveBeenCalledOnce();
            expect(dispose2).toHaveBeenCalledOnce();
        });
    });

    describe('Container Management', () => {
        it('should clear all systems', () => {
            container.register({
                key: Symbol('Test'),
                factory: () => ({})
            });

            expect(container.getRegisteredKeys().length).toBe(1);

            container.clear();

            expect(container.getRegisteredKeys().length).toBe(0);
        });

        it('should return all registered keys', () => {
            const key1 = Symbol('Test1');
            const key2 = Symbol('Test2');

            container.register({ key: key1, factory: () => ({}) });
            container.register({ key: key2, factory: () => ({}) });

            const keys = container.getRegisteredKeys();

            expect(keys).toContain(key1);
            expect(keys).toContain(key2);
            expect(keys.length).toBe(2);
        });
    });
});
