// engine/tests/InputActionMapper.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InputActionMapper } from '@engine/input/InputActionMapper';
import { EventBus } from '@engine/core/EventBus';
import { createMockLogger } from './helpers/loggerMocks';

vi.mock('@engine/core/EventBus');
const mockLogger = createMockLogger();
describe('InputActionMapper', () => {
    let mapper: InputActionMapper;
    let mockEventBus: EventBus;

    beforeEach(() => {
        mockEventBus = new EventBus(mockLogger);
        vi.spyOn(mockEventBus, 'emit');
        mapper = new InputActionMapper(mockEventBus);
    });

    it('should register an action', () => {
        mapper.registerAction('jump', [{ type: 'key', input: ' ' }]);
        expect(mapper.getActions().has('jump')).toBe(true);
    });

    it('should trigger a simple key action', () => {
        mapper.registerAction('jump', [{ type: 'key', input: ' ' }]);
        mapper.checkActionTriggers('key', ' ');
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'jump' });
    });

    it('should not trigger action for different key', () => {
        mapper.registerAction('jump', [{ type: 'key', input: ' ' }]);
        mapper.checkActionTriggers('key', 'a');
        expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should trigger a mouse action', () => {
        mapper.registerAction('fire', [{ type: 'mouse', input: 0 }]);
        mapper.checkActionTriggers('mouse', 0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'fire' });
    });

    it('should trigger a key action with exact modifiers', () => {
        mapper.registerAction('save', [{ type: 'key', input: 's', modifiers: { ctrl: true } }]);

        // Fail: no modifiers
        mapper.checkActionTriggers('key', 's', { shift: false, ctrl: false, alt: false, meta: false });
        expect(mockEventBus.emit).not.toHaveBeenCalled();

        // Fail: wrong modifiers
        mapper.checkActionTriggers('key', 's', { shift: true, ctrl: true, alt: false, meta: false });
        expect(mockEventBus.emit).not.toHaveBeenCalled();

        // Success: exact modifiers
        mapper.checkActionTriggers('key', 's', { shift: false, ctrl: true, alt: false, meta: false });
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'save' });
    });

    it('should trigger an action with no modifiers', () => {
        mapper.registerAction('move', [{ type: 'key', input: 'w' }]);

        // Fail: modifier pressed
        mapper.checkActionTriggers('key', 'w', { shift: true, ctrl: false, alt: false, meta: false });
        expect(mockEventBus.emit).not.toHaveBeenCalled();

        // Success: no modifiers
        mapper.checkActionTriggers('key', 'w', { shift: false, ctrl: false, alt: false, meta: false });
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'move' });
    });

    it('should correctly handle multiple bindings', () => {
        mapper.registerAction('interact', [
            { type: 'key', input: 'e' },
            { type: 'mouse', input: 0 }
        ]);

        mapper.checkActionTriggers('key', 'e');
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'interact' });

        mapper.checkActionTriggers('mouse', 0);
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'interact' });

        expect(mockEventBus.emit).toHaveBeenCalledTimes(2);
    });
});