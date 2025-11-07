// engine/tests/InputManager.test.ts

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InputManager } from '@engine/systems/InputManager';
import { EventBus } from '@engine/core/EventBus';
import { GameStateManager } from '@engine/core/GameStateManager';
import type { KeyDownEvent } from '@engine/core/InputEvents';
import type { GameState } from '@engine/core/GameState';

// Mock dependencies
vi.mock('@engine/core/EventBus');
vi.mock('@engine/core/GameStateManager');

describe('InputManager', () => {
    let inputManager: InputManager;
    let mockStateManager: GameStateManager;
    let mockEventBus: EventBus;
    let mockState: GameState;

    beforeEach(() => {
        // Create new mocks for each test
        mockEventBus = new EventBus();
        mockStateManager = new GameStateManager();
        mockState = {
            handleEvent: vi.fn(),
        } as unknown as GameState;

        // Spy on the methods
        vi.spyOn(mockEventBus, 'emit');
        vi.spyOn(mockStateManager, 'handleEvent');
        vi.spyOn(mockStateManager, 'getCurrentState').mockReturnValue(mockState);

        inputManager = new InputManager(mockStateManager, mockEventBus);

        // Mock Date.now() for time-sensitive combo tests
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    // Helper to simulate a keydown event
    const pressKey = (key: string, modifiers: Partial<KeyDownEvent> = {}) => {
        const event: KeyDownEvent = {
            type: 'keydown',
            key,
            code: `Key${key.toUpperCase()}`,
            repeat: false,
            shift: !!modifiers.shift,
            ctrl: !!modifiers.ctrl,
            alt: !!modifiers.alt,
            meta: !!modifiers.meta,
            timestamp: Date.now(),
        };
        inputManager.processEvent(event);
    };

    it('should process a keydown event and update state', () => {
        pressKey('w');

        // 1. Check internal state
        expect(inputManager.isKeyDown('w')).toBe(true);

        // 2. Check if it was passed to the state manager
        expect(mockStateManager.handleEvent).toHaveBeenCalledOnce();

        // 3. Check if it was emitted on the event bus
        expect(mockEventBus.emit).toHaveBeenCalledWith('input.keydown', expect.any(Object));
    });

    describe('Action Mapping', () => {
        it('should register and trigger a simple action', () => {
            inputManager.registerAction('move_forward', [
                { type: 'key', input: 'w' }
            ]);

            pressKey('w');

            expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'move_forward' });
        });

        it('should not trigger an action for a different key', () => {
            inputManager.registerAction('move_forward', [
                { type: 'key', input: 'w' }
            ]);

            pressKey('a');

            expect(mockEventBus.emit).not.toHaveBeenCalledWith('input.action', { action: 'move_forward' });
        });

        it('should trigger an action with modifiers', () => {
            inputManager.registerAction('save', [
                { type: 'key', input: 's', modifiers: { ctrl: true } }
            ]);

            pressKey('s', { ctrl: true });

            expect(mockEventBus.emit).toHaveBeenCalledWith('input.action', { action: 'save' });
        });

        it('should not trigger a modified action without the modifier', () => {
            inputManager.registerAction('save', [
                { type: 'key', input: 's', modifiers: { ctrl: true } }
            ]);

            pressKey('s'); // No Ctrl pressed

            expect(mockEventBus.emit).not.toHaveBeenCalledWith('input.action', { action: 'save' });
        });

        it('should not trigger a simple action when modifiers are pressed', () => {
            inputManager.registerAction('type_s', [
                { type: 'key', input: 's' }
            ]);

            pressKey('s', { ctrl: true }); // Ctrl is pressed

            // The 'type_s' action should NOT be triggered
            expect(mockEventBus.emit).not.toHaveBeenCalledWith('input.action', { action: 'type_s' });
        });
    });

    describe('Combo Detection', () => {
        beforeEach(() => {
            inputManager.registerCombo('hadoken', ['a', 'a', 'd'], 1000);
        });

        it('should add inputs to the buffer', () => {
            pressKey('a');
            pressKey('b');
            pressKey('c');
            expect(inputManager.getInputBuffer()).toEqual(['a', 'b', 'c']);
        });

        it('should respect the buffer size limit (default 10)', () => {
            for (let i = 0; i < 15; i++) {
                pressKey(String(i));
            }
            expect(inputManager.getInputBuffer()).toHaveLength(10);
            expect(inputManager.getInputBuffer()[0]).toBe('5'); // Starts at '5'
        });

        it('should detect a correct combo sequence', () => {
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('d');

            expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'hadoken' });
        });

        it('should not detect an incorrect combo sequence', () => {
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('d'); // Wrong key
            vi.advanceTimersByTime(100);
            pressKey('a');

            expect(mockEventBus.emit).not.toHaveBeenCalledWith('input.combo', { combo: 'hadoken' });
        });

        it('should not detect a combo outside the time window', () => {
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('a');
            vi.advanceTimersByTime(1100); // Exceeds 1000ms time window
            pressKey('d');

            expect(mockEventBus.emit).not.toHaveBeenCalledWith('input.combo', { combo: 'hadoken' });
        });

        it('should detect a combo with other inputs in between (if buffer is large enough)', () => {
            // Note: This test assumes combos are checked from the *end* of the buffer.
            // The current implementation checks the *most recent* inputs matching the combo length.

            pressKey('x'); // Ignored input
            pressKey('y'); // Ignored input

            vi.advanceTimersByTime(100);
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('a');
            vi.advanceTimersByTime(100);
            pressKey('d');

            // The last 3 inputs match the combo
            expect(inputManager.getInputBuffer()).toEqual(['x', 'y', 'a', 'a', 'd']);
            expect(mockEventBus.emit).toHaveBeenCalledWith('input.combo', { combo: 'hadoken' });
        });
    });
});