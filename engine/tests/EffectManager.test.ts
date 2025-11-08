// engine/tests/EffectManager.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EffectManager } from '@engine/systems/EffectManager';
import type { GameContext } from '@engine/types';
import type { IDynamicEffect, IEffectTarget, IGlobalEffect } from '@engine/types/EffectTypes';
import { DomEffectTarget } from '@engine/rendering/DomEffectTarget';

// Mock dependencies
const mockDynamicEffect: IDynamicEffect = {
    onStart: vi.fn(),
    onUpdate: vi.fn(),
    onStop: vi.fn(),
};

const mockGlobalEffect: IGlobalEffect = {
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onDestroy: vi.fn(),
};

const mockTarget: IEffectTarget = {
    id: 'target1',
    getProperty: vi.fn(),
    setProperty: vi.fn(),
    getRaw: vi.fn(() => document.createElement('div')), // Return a real div for static effects
};

describe('EffectManager', () => {
    let effectManager: EffectManager;
    let mockContainer: HTMLElement;
    let mockContext: GameContext;
    let mockDomElement: HTMLElement;
    let domTarget: DomEffectTarget;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockContainer = document.createElement('div');
        mockContext = {} as GameContext;
        effectManager = new EffectManager(mockContainer);

        effectManager.registerDynamicEffect('test_dynamic', mockDynamicEffect);
        effectManager.registerGlobalEffect('test_global', mockGlobalEffect);
        effectManager.registerStaticEffect('test_static', 'fade-in');

        // Setup for static effect test
        mockDomElement = document.createElement('div');
        mockDomElement.id = 'domTarget';
        domTarget = new DomEffectTarget(mockDomElement);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Dynamic Effects', () => {
        it('should register and apply a dynamic effect', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            expect(mockDynamicEffect.onStart).toHaveBeenCalledWith(mockTarget, mockContext);
        });

        it('should call onUpdate for active dynamic effects', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            effectManager.update(0.16, mockContext);
            expect(mockDynamicEffect.onUpdate).toHaveBeenCalledWith(mockTarget, mockContext, 0.16);
        });

        it('should remove a dynamic effect', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            effectManager.remove(mockTarget, 'test_dynamic', mockContext);
            expect(mockDynamicEffect.onStop).toHaveBeenCalledWith(mockTarget, mockContext);

            effectManager.update(0.16, mockContext);
            expect(mockDynamicEffect.onUpdate).not.toHaveBeenCalled();
        });

        it('should apply an effect with a duration', async () => {
            const p = effectManager.apply(mockTarget, 'test_dynamic', mockContext, 1000); // 1 sec
            expect(mockDynamicEffect.onStart).toHaveBeenCalled();

            vi.advanceTimersByTime(500);
            expect(mockDynamicEffect.onStop).not.toHaveBeenCalled();

            vi.advanceTimersByTime(500); // Total 1000ms
            await p; // Wait for the promise to resolve
            expect(mockDynamicEffect.onStop).toHaveBeenCalled();
        });

        it('should run a sequence of effects', async () => {
            effectManager.registerDynamicEffect('other_effect', mockDynamicEffect);

            const steps = [
                { name: 'test_dynamic', duration: 100 },
                { wait: 200 },
                { name: 'other_effect', duration: 50 },
            ];

            const sequencePromise = effectManager.sequence(mockTarget, steps, mockContext);

            expect(mockDynamicEffect.onStart).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(100); // End of step 1
            await vi.runOnlyPendingTimersAsync(); // Resolve duration promise
            expect(mockDynamicEffect.onStop).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(200); // End of step 2
            await vi.runOnlyPendingTimersAsync();

            // Start of step 3
            expect(mockDynamicEffect.onStart).toHaveBeenCalledTimes(2);

            vi.advanceTimersByTime(50); // End of step 3
            await vi.runOnlyPendingTimersAsync();
            expect(mockDynamicEffect.onStop).toHaveBeenCalledTimes(2);

            await sequencePromise; // Sequence is complete
        });

        it('should stop all effects', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            effectManager.stopAllEffects(mockContext);
            expect(mockDynamicEffect.onStop).toHaveBeenCalled();
        });
    });

    // --- NEW TEST SUITE ---
    describe('Static Effects', () => {
        it('should apply a static CSS class effect', () => {
            effectManager.apply(domTarget, 'test_static', mockContext);
            expect(mockDomElement.classList.contains('fade-in')).toBe(true);
        });

        it('should remove a static CSS class effect', () => {
            effectManager.apply(domTarget, 'test_static', mockContext);
            expect(mockDomElement.classList.contains('fade-in')).toBe(true);

            effectManager.remove(domTarget, 'test_static', mockContext);
            expect(mockDomElement.classList.contains('fade-in')).toBe(false);
        });
    });

    // --- NEW TEST SUITE ---
    describe('Global Effects', () => {
        it('should start and update a global effect', () => {
            effectManager.startGlobalEffect('test_global', mockContext);
            expect(mockGlobalEffect.onCreate).toHaveBeenCalledWith(mockContainer, mockContext);

            effectManager.update(0.16, mockContext);
            expect(mockGlobalEffect.onUpdate).toHaveBeenCalledWith(mockContext, 0.16);
        });

        it('should stop a global effect', () => {
            effectManager.startGlobalEffect('test_global', mockContext);
            effectManager.stopGlobalEffect('test_global', mockContext);
            expect(mockGlobalEffect.onDestroy).toHaveBeenCalledWith(mockContext);

            effectManager.update(0.16, mockContext);
            expect(mockGlobalEffect.onUpdate).not.toHaveBeenCalled();
        });
    });
});