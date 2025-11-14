import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameStateManager } from '@engine/core/GameStateManager';
import { GameState } from '@engine/core/GameState';
import type { GameContext } from '@engine/types';
import { createMockLogger } from './helpers/loggerMocks';
const mockLogger = createMockLogger();
// Create a mock GameState class
// We will spy on its methods AFTER instantiation
class MockState extends GameState {
    // Keep the original implementations
}

describe('GameStateManager', () => {
    let gsm: GameStateManager;
    let stateA: MockState;
    let stateB: MockState;
    let mockContext: GameContext;

    beforeEach(() => {
        gsm = new GameStateManager(mockLogger);
        stateA = new MockState('stateA', mockLogger);
        stateB = new MockState('stateB', mockLogger);

        // Mock the context that will be injected
        mockContext = {
            game: {},
            flags: new Set(),
            variables: new Map(),
            renderQueue: []
        } as GameContext;

        // Spy on the methods INSTEAD of replacing them
        vi.spyOn(stateA, 'enter');
        vi.spyOn(stateA, 'exit');
        vi.spyOn(stateA, 'pause');
        vi.spyOn(stateA, 'resume');
        vi.spyOn(stateA, 'update');
        vi.spyOn(stateA, 'handleEvent');

        vi.spyOn(stateB, 'enter');
        vi.spyOn(stateB, 'exit');
        vi.spyOn(stateB, 'pause');
        vi.spyOn(stateB, 'resume');
        vi.spyOn(stateB, 'update');
        vi.spyOn(stateB, 'handleEvent');

        gsm.setContext(mockContext);
        gsm.register('stateA', stateA);
        gsm.register('stateB', stateB);
    });

    it('should register states and inject context', () => {
        // Test registration indirectly by successfully pushing the state
        // If registration failed, pushState would log an error
        gsm.pushState('stateA');
        expect(stateA.enter).toHaveBeenCalledOnce();
        // The real GameState.setContext is called during registration
        expect(stateA['context']).toBe(mockContext);
        gsm.popState(); // Clean up for other tests
    });

    it('should push a state', () => {
        gsm.pushState('stateA');

        expect(gsm.getCurrentStateName()).toBe('stateA');
        expect(stateA.enter).toHaveBeenCalledOnce();
        expect(stateA.isActive).toBe(true); // Verify state is set
    });

    it('should pause the previous state when pushing a new one', () => {
        gsm.pushState('stateA');
        gsm.pushState('stateB');

        expect(gsm.getCurrentStateName()).toBe('stateB');
        expect(stateA.pause).toHaveBeenCalledOnce();
        expect(stateB.enter).toHaveBeenCalledOnce();
        expect(stateB.isActive).toBe(true);
    });

    it('should pop a state', () => {
        gsm.pushState('stateA');
        gsm.pushState('stateB');

        gsm.popState();

        expect(gsm.getCurrentStateName()).toBe('stateA');
        expect(stateB.exit).toHaveBeenCalledOnce();
        expect(stateB.isActive).toBe(false); // Verify state is set
        expect(stateA.resume).toHaveBeenCalledOnce();
    });

    it('should change state (clear stack and push)', () => {
        gsm.pushState('stateA');
        gsm.pushState('stateB');

        gsm.changeState('stateA');

        expect(gsm.getCurrentStateName()).toBe('stateA');
        expect(stateB.exit).toHaveBeenCalledOnce();
        // stateA was already on the stack, so it's exited...
        expect(stateA.exit).toHaveBeenCalledOnce();

        // ...and then the new stateA is entered
        // FIX: This is the correct assertion
        expect(stateA.enter).toHaveBeenCalledTimes(2);
        expect(stateA.isActive).toBe(true);
    });

    it('should update the current state', () => {
        gsm.pushState('stateA');
        gsm.pushState('stateB');

        gsm.update(0.16);

        // FIX: This now works because stateB.isActive is true
        expect(stateB.update).toHaveBeenCalledWith(0.16);
        expect(stateA.update).not.toHaveBeenCalled();
    });

    it('should handle events on the current state', () => {
        const mockEvent = { type: 'keydown' } as any;
        gsm.pushState('stateA');
        gsm.pushState('stateB');

        gsm.handleEvent(mockEvent);

        // FIX: This now works because stateB.isActive is true
        expect(stateB.handleEvent).toHaveBeenCalledWith(mockEvent);
        expect(stateA.handleEvent).not.toHaveBeenCalled();
    });
});