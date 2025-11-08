// engine/tests/DomInputAdapter.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DomInputAdapter } from '@engine/core/DomInputAdapter';
import { InputManager } from '@engine/systems/InputManager';
// --- FIX for TS6133: Removed unused PlatformContainer import ---
// import type { PlatformContainer } from '@engine/core/PlatformContainer';

// Mock InputManager
vi.mock('@engine/systems/InputManager');

// Mock a DOM element and its event methods
const mockElement = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    hasAttribute: vi.fn(() => false),
    focus: vi.fn(),
};

// Mock a PlatformContainer
const mockContainer = {
    getDomElement: vi.fn(() => mockElement as any),
};

describe('DomInputAdapter', () => {
    let adapter: DomInputAdapter;
    let mockInputManager: InputManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mockInputManager = new (vi.mocked(InputManager))(null as any, null as any);
        adapter = new DomInputAdapter(mockInputManager);
    });

    it('should attach to a container, set tabindex, and add listeners', () => {
        adapter.attachToContainer(mockContainer as any, { focus: true, tabindex: '0' });

        expect(mockContainer.getDomElement).toHaveBeenCalled();
        expect(mockElement.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        expect(mockElement.focus).toHaveBeenCalled();
        
        expect(mockElement.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(mockElement.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
        // ... etc. ...
        expect(mockElement.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('should detach and remove all listeners', () => {
        adapter.attach(mockElement as any);
        
        const keyDownListener = vi.mocked(mockElement.addEventListener).mock.calls.find(
            c => c[0] === 'keydown'
        )![1];

        adapter.detach();

        expect(mockElement.removeEventListener).toHaveBeenCalledWith('keydown', keyDownListener);
        expect(mockElement.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should translate a keydown event', () => {
        adapter.attach(mockElement as any);
        const onKeyDown = vi.mocked(mockElement.addEventListener).mock.calls.find(c => c[0] === 'keydown')![1];
        
        // --- FIX for TS2352: Cast partial mock to 'any' ---
        const mockEvent = { key: 'w', code: 'KeyW', repeat: false, shiftKey: false, ctrlKey: true, altKey: false, metaKey: false } as any;
        onKeyDown(mockEvent);

        expect(mockInputManager.processEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'keydown',
                key: 'w',
                code: 'KeyW',
                ctrl: true
            })
        );
    });

    it('should translate a mousedown event', () => {
        adapter.attach(mockElement as any);
        const onMouseDown = vi.mocked(mockElement.addEventListener).mock.calls.find(c => c[0] === 'mousedown')![1];
        
        // --- FIX for TS2352: Cast partial mock to 'any' ---
        const mockEvent = { button: 0, clientX: 100, clientY: 50, shiftKey: true } as any;
        onMouseDown(mockEvent);

        expect(mockInputManager.processEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'mousedown',
                button: 0,
                x: 100,
                y: 50,
                shift: true
            })
        );
    });
    
    it('should translate a touchstart event', () => {
        adapter.attach(mockElement as any);
        const onTouchStart = vi.mocked(mockElement.addEventListener).mock.calls.find(c => c[0] === 'touchstart')![1];
        
        const mockTouch = { identifier: 1, clientX: 50, clientY: 60, force: 0.5 };
        // --- FIX for TS2352: Cast partial mock to 'any' ---
        const mockEvent = { touches: [mockTouch] } as any;
        onTouchStart(mockEvent);

        expect(mockInputManager.processEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'touchstart',
                touches: [
                    { id: 1, x: 50, y: 60, force: 0.5 }
                ]
            })
        );
    });
});