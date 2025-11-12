// engine/tests/ActionRegistry.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionRegistry } from '@engine/systems/ActionRegistry';
import { Action } from '@engine/systems/Action';
import type { ActionContext } from '@engine/types';
import type {ILogger} from "@engine/interfaces";
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// Create mock actions
class MockAction extends Action {
    canExecuteResult = true;
    executeResult: any = null;

    canExecute(context: ActionContext): boolean {
        return this.canExecuteResult;
    }
    execute(context: ActionContext): any {
        return this.executeResult;
    }
}

describe('ActionRegistry', () => {
    let registry: ActionRegistry;
    let mockContext: ActionContext;
    let actionA: MockAction;
    let actionB: MockAction;

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        registry = new ActionRegistry(mockLogger);
        mockContext = {} as ActionContext;

        actionA = new MockAction('actionA', 'Action A');
        actionB = new MockAction('actionB', 'Action B');

        vi.spyOn(actionA, 'execute');
        vi.spyOn(actionA, 'canExecute');
        vi.spyOn(actionB, 'execute');
    });

    it('should register an action', () => {
        registry.register(actionA, 'default');
        expect(registry.get('actionA')).toBe(actionA);
    });

    it('should get actions by type', () => {
        registry.register(actionA, 'default');
        registry.register(actionB, 'combat');

        expect(registry.getByType('default')).toEqual([actionA]);
        expect(registry.getByType('combat')).toEqual([actionB]);
        expect(registry.getByType('unknown')).toEqual([]);
    });

    it('should execute an action by ID', () => {
        actionA.executeResult = 'Success';
        registry.register(actionA);

        const result = registry.execute('actionA', mockContext);

        expect(result).toBe('Success');
        expect(actionA.execute).toHaveBeenCalledWith(mockContext);
    });

    it('should not execute an action if canExecute is false', () => {
        actionA.canExecuteResult = false;
        registry.register(actionA);

        const result = registry.execute('actionA', mockContext);

        expect(result).toBe(null);
        expect(actionA.execute).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('cannot be executed'),
            expect.any(String)
        );
    });

    it('should log an error if action is not found', () => {
        registry.execute('unknown', mockContext);
        expect(console.error).toHaveBeenCalledWith("[ActionRegistry] Action 'unknown' not found");
    });

    it('should get available actions for a context', () => {
        actionA.canExecuteResult = true;
        actionB.canExecuteResult = false;
        registry.register(actionA, 'default');
        registry.register(actionB, 'default');

        const available = registry.getAvailableActions('default', mockContext);

        expect(available).toHaveLength(1);
        expect(available[0]).toBe(actionA);
        expect(actionA.canExecute).toHaveBeenCalledWith(mockContext);
    });
});