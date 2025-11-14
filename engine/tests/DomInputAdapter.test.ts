// engine/tests/DomInputAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type {ILogger} from "@engine/interfaces";
import type { IDomRenderContainer } from '@engine/interfaces/IRenderContainer';
import {DomInputAdapter} from "@engine/input/DomInputAdapter";

// Mock a DOM element and its event methods
const mockElement = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    hasAttribute: vi.fn(() => false),
    focus: vi.fn(),
};

// Mock a DOM render container
const createMockDomContainer = (): IDomRenderContainer => ({
    getType: () => 'dom' as const,
    getElement: () => mockElement as any,
    createElement: (tagName: string) => document.createElement(tagName),
    getDimensions: () => ({ width: 800, height: 600 }),
    requestAnimationFrame: (callback: () => void) => {
        const id = requestAnimationFrame(callback);
        return () => cancelAnimationFrame(id);
    },
});

const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};


describe('DomInputAdapter', () => {
    let adapter: DomInputAdapter;
    let mockEventHandler: ReturnType<typeof vi.fn>;
    let listenerMap: Map<string, (evt: any) => void>;
    let mockContainer: IDomRenderContainer;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new DomInputAdapter(mockLogger);

        // Mock event handler
        mockEventHandler = vi.fn();
        adapter.onEvent(mockEventHandler);

        // Capture listeners to call them manually
        listenerMap = new Map();
        vi.mocked(mockElement.addEventListener).mockImplementation((event: string, listener: any) => {
            listenerMap.set(event, listener);
        });

        mockContainer = createMockDomContainer();
        adapter.attach(mockContainer);
    });

    it('should attach to element and add all listeners', () => {
        // Create a new adapter to test fresh attach with options
        const testAdapter = new DomInputAdapter(mockLogger);
        testAdapter.attach(mockContainer, { focus: true, tabindex: '0' });

        expect(mockElement.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        expect(mockElement.focus).toHaveBeenCalled();

        expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('should detach and remove all listeners', () => {
        const keyDownListener = listenerMap.get('keydown')!;
        adapter.detach();
        expect(mockElement.removeEventListener).toHaveBeenCalledWith('keydown', keyDownListener);
        expect(mockElement.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should translate a keydown event', () => {
        const mockEvent = { key: 'w', code: 'KeyW', repeat: false, shiftKey: false, ctrlKey: true, altKey: false, metaKey: false } as any;
        listenerMap.get('keydown')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'keydown', key: 'w', ctrl: true }));
    });

    // --- NEW TEST ---
    it('should translate a keyup event', () => {
        const mockEvent = { key: 'w', code: 'KeyW', shiftKey: true } as any;
        listenerMap.get('keyup')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'keyup', key: 'w', shift: true }));
    });

    it('should translate a mousedown event', () => {
        const mockEvent = { button: 0, clientX: 100, clientY: 50, shiftKey: true } as any;
        listenerMap.get('mousedown')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'mousedown', button: 0, x: 100, y: 50, shift: true }));
    });

    // --- NEW TEST ---
    it('should translate a mouseup event', () => {
        const mockEvent = { button: 1, clientX: 100, clientY: 50 } as any;
        listenerMap.get('mouseup')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'mouseup', button: 1, x: 100 }));
    });

    // --- NEW TEST ---
    it('should translate a mousemove event', () => {
        const mockEvent = { clientX: 100, clientY: 50, movementX: 5, movementY: -2 } as any;
        listenerMap.get('mousemove')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'mousemove', x: 100, deltaX: 5, deltaY: -2 }));
    });

    // --- NEW TEST ---
    it('should translate a wheel event', () => {
        const mockEvent = { clientX: 100, clientY: 50, deltaY: 10 } as any;
        listenerMap.get('wheel')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'wheel', x: 100, deltaY: 10 }));
    });

    // --- NEW TEST ---
    it('should translate a click event', () => {
        const mockTarget = document.createElement('div');
        const mockEvent = { button: 0, clientX: 10, clientY: 20, target: mockTarget } as any;
        listenerMap.get('click')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'click', button: 0, target: mockTarget }));
    });

    it('should translate a touchstart event', () => {
        const mockTouch = { identifier: 1, clientX: 50, clientY: 60, force: 0.5 };
        const mockEvent = { touches: [mockTouch] } as any;
        listenerMap.get('touchstart')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'touchstart', touches: [{ id: 1, x: 50, y: 60, force: 0.5 }] }));
    });

    // --- NEW TEST ---
    it('should translate a touchmove event', () => {
        const mockTouch = { identifier: 1, clientX: 55, clientY: 65, force: 0.5 };
        const mockEvent = { touches: [mockTouch] } as any;
        listenerMap.get('touchmove')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'touchmove', touches: [{ id: 1, x: 55, y: 65, force: 0.5 }] }));
    });

    // --- NEW TEST ---
    it('should translate a touchend event', () => {
        const mockEvent = { touches: [] } as any; // No remaining touches
        listenerMap.get('touchend')!(mockEvent);
        expect(mockEventHandler).toHaveBeenCalledWith(expect.objectContaining({ type: 'touchend', touches: [] }));
    });
});