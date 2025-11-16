// engine/tests/EffectManager.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EffectManager } from '@game-engine/core/systems/EffectManager';
import type { GameContext } from '@game-engine/core/types';
import type { IDynamicEffect, IEffectTarget } from '@game-engine/core/types/EffectTypes';
import type { ITimerProvider } from '@game-engine/core/interfaces/ITimerProvider';
import { DomEffectTarget } from '@game-engine/core/rendering/DomEffectTarget';
import { createMockLogger } from './helpers/loggerMocks';

// Mock dependencies
const mockDynamicEffect: IDynamicEffect = {
    onStart: vi.fn(),
    onUpdate: vi.fn(),
    onStop: vi.fn(),
};

const mockTarget: IEffectTarget = {
    id: 'target1',
    getProperty: vi.fn(),
    setProperty: vi.fn(),
    getRaw: vi.fn(() => document.createElement('div')),
};

const mockLogger = createMockLogger();

describe('EffectManager', () => {
    let effectManager: EffectManager;
    let mockTimerProvider: ITimerProvider;
    let mockContext: GameContext;
    let mockDomElement: HTMLElement;
    let domTarget: DomEffectTarget;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockContext = {} as GameContext;

        // Mock timer provider to use Vitest's fake timers
        mockTimerProvider = {
            setTimeout: vi.fn((cb, ms) => window.setTimeout(cb, ms) as unknown),
            clearTimeout: vi.fn((id) => window.clearTimeout(id as number)),
            now: () => Date.now()
        };

        effectManager = new EffectManager(mockTimerProvider, mockLogger);

        effectManager.registerDynamicEffect('test_dynamic', mockDynamicEffect);
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
            expect(mockDynamicEffect.onStart).toHaveBeenCalledWith(mockTarget, mockContext, mockLogger);
        });

        it('should call onUpdate for active dynamic effects', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            effectManager.update(0.16, mockContext);
            expect(mockDynamicEffect.onUpdate).toHaveBeenCalledWith(mockTarget, mockContext, 0.16, mockLogger);
        });

        it('should remove a dynamic effect', () => {
            effectManager.apply(mockTarget, 'test_dynamic', mockContext);
            effectManager.remove(mockTarget, 'test_dynamic', mockContext);
            expect(mockDynamicEffect.onStop).toHaveBeenCalledWith(mockTarget, mockContext, mockLogger);

            effectManager.update(0.16, mockContext);
            expect(mockDynamicEffect.onUpdate).not.toHaveBeenCalled();
        });

        it('should apply an effect with a duration', async () => {
            const p = effectManager.apply(mockTarget, 'test_dynamic', mockContext, 1000); // 1 sec
            expect(mockDynamicEffect.onStart).toHaveBeenCalled();
            expect(mockTimerProvider.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

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

});