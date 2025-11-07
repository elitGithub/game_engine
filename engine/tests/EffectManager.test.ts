// engine/tests/EffectManager.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EffectManager } from '@engine/systems/EffectManager';
import type { GameContext } from '@engine/types';
import type { IDynamicEffect, IEffectTarget } from '@engine/types/EffectTypes';

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

describe('EffectManager', () => {
    let effectManager: EffectManager;
    let mockContainer: HTMLElement;
    let mockContext: GameContext;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        mockContainer = document.createElement('div');
        mockContext = {} as GameContext;
        effectManager = new EffectManager(mockContainer);

        effectManager.registerDynamicEffect('test_dynamic', mockDynamicEffect);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

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

        // Should not be updated after removal
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