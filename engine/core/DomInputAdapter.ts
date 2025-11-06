// engine/core/DomInputAdapter.ts
import type { InputManager } from '../systems/InputManager';
import type { PlatformContainer } from './PlatformContainer';
import type {
    KeyDownEvent,
    KeyUpEvent,
    MouseDownEvent,
    MouseUpEvent,
    MouseMoveEvent,
    MouseWheelEvent,
    ClickEvent,
    TouchStartEvent,
    TouchMoveEvent,
    TouchEndEvent
} from './InputEvents';

/**
 * DomInputAdapter - Translates DOM events to engine-agnostic input events
 *
 * This adapter is responsible for:
 * - Attaching/detaching DOM event listeners
 * - Translating KeyboardEvent, MouseEvent, TouchEvent to engine events
 * - Managing the lifecycle of DOM-specific resources
 *
 * The InputManager remains platform-independent and only processes engine events.
 *
 * Platform requirements: Requires container.getDomElement() support
 */
export class DomInputAdapter {
    private inputManager: InputManager;
    private targetElement: HTMLElement | null;
    private boundListeners: Map<string, (evt: any) => void>;

    constructor(inputManager: InputManager) {
        this.inputManager = inputManager;
        this.targetElement = null;
        this.boundListeners = new Map();
    }

    /**
     * Attach to a platform container
     * Requires container.getDomElement() to be available
     */
    attachToContainer(container: PlatformContainer, options?: { focus?: boolean; tabindex?: string }): boolean {
        const element = container.getDomElement?.();
        if (!element) {
            console.warn('[DomInputAdapter] Container does not provide DOM element. Skipping.');
            return false;
        }

        this.attach(element, options);
        return true;
    }

    /**
     * Direct attach to HTML element (legacy/direct usage)
     */
    attach(element: HTMLElement, options?: { focus?: boolean; tabindex?: string }): void {
        if (this.targetElement) {
            this.detach();
        }

        this.targetElement = element;

        if (options?.tabindex !== undefined) {
            element.setAttribute('tabindex', options.tabindex);
        } else if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }

        this.attachListeners();

        if (options?.focus) {
            element.focus();
        }
    }

    detach(): void {
        if (!this.targetElement) return;

        this.boundListeners.forEach((listener, event) => {
            this.targetElement!.removeEventListener(event, listener);
        });
        this.boundListeners.clear();

        this.targetElement = null;
    }

    private attachListeners(): void {
        if (!this.targetElement) return;

        const onKeyDown = this.onKeyDown.bind(this);
        const onKeyUp = this.onKeyUp.bind(this);
        const onMouseDown = this.onMouseDown.bind(this);
        const onMouseUp = this.onMouseUp.bind(this);
        const onMouseMove = this.onMouseMove.bind(this);
        const onWheel = this.onWheel.bind(this);
        const onClick = this.onClick.bind(this);
        const onTouchStart = this.onTouchStart.bind(this);
        const onTouchMove = this.onTouchMove.bind(this);
        const onTouchEnd = this.onTouchEnd.bind(this);

        this.targetElement.addEventListener('keydown', onKeyDown);
        this.targetElement.addEventListener('keyup', onKeyUp);
        this.targetElement.addEventListener('mousedown', onMouseDown);
        this.targetElement.addEventListener('mouseup', onMouseUp);
        this.targetElement.addEventListener('mousemove', onMouseMove);
        this.targetElement.addEventListener('wheel', onWheel);
        this.targetElement.addEventListener('click', onClick);
        this.targetElement.addEventListener('touchstart', onTouchStart);
        this.targetElement.addEventListener('touchmove', onTouchMove);
        this.targetElement.addEventListener('touchend', onTouchEnd);

        this.boundListeners.set('keydown', onKeyDown);
        this.boundListeners.set('keyup', onKeyUp);
        this.boundListeners.set('mousedown', onMouseDown);
        this.boundListeners.set('mouseup', onMouseUp);
        this.boundListeners.set('mousemove', onMouseMove);
        this.boundListeners.set('wheel', onWheel);
        this.boundListeners.set('click', onClick);
        this.boundListeners.set('touchstart', onTouchStart);
        this.boundListeners.set('touchmove', onTouchMove);
        this.boundListeners.set('touchend', onTouchEnd);
    }

    // ============================================================================
    // KEYBOARD EVENT TRANSLATION
    // ============================================================================

    private onKeyDown(e: KeyboardEvent): void {
        const event: KeyDownEvent = {
            type: 'keydown',
            timestamp: Date.now(),
            key: e.key,
            code: e.code,
            repeat: e.repeat,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.inputManager.processEvent(event);
    }

    private onKeyUp(e: KeyboardEvent): void {
        const event: KeyUpEvent = {
            type: 'keyup',
            timestamp: Date.now(),
            key: e.key,
            code: e.code,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.inputManager.processEvent(event);
    }

    // ============================================================================
    // MOUSE EVENT TRANSLATION
    // ============================================================================

    private onMouseDown(e: MouseEvent): void {
        const event: MouseDownEvent = {
            type: 'mousedown',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.inputManager.processEvent(event);
    }

    private onMouseUp(e: MouseEvent): void {
        const event: MouseUpEvent = {
            type: 'mouseup',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.inputManager.processEvent(event);
    }

    private onMouseMove(e: MouseEvent): void {
        const event: MouseMoveEvent = {
            type: 'mousemove',
            timestamp: Date.now(),
            x: e.clientX,
            y: e.clientY,
            deltaX: e.movementX,
            deltaY: e.movementY,
            buttons: e.buttons
        };

        this.inputManager.processEvent(event);
    }

    private onWheel(e: WheelEvent): void {
        const event: MouseWheelEvent = {
            type: 'wheel',
            timestamp: Date.now(),
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            x: e.clientX,
            y: e.clientY
        };

        this.inputManager.processEvent(event);
    }

    private onClick(e: MouseEvent): void {
        const event: ClickEvent = {
            type: 'click',
            timestamp: Date.now(),
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            target: e.target
        };

        this.inputManager.processEvent(event);
    }

    // ============================================================================
    // TOUCH EVENT TRANSLATION
    // ============================================================================

    private onTouchStart(e: TouchEvent): void {
        const touches = Array.from(e.touches).map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY,
            force: t.force
        }));

        const event: TouchStartEvent = {
            type: 'touchstart',
            timestamp: Date.now(),
            touches
        };

        this.inputManager.processEvent(event);
    }

    private onTouchMove(e: TouchEvent): void {
        const touches = Array.from(e.touches).map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY,
            force: t.force
        }));

        const event: TouchMoveEvent = {
            type: 'touchmove',
            timestamp: Date.now(),
            touches
        };

        this.inputManager.processEvent(event);
    }

    private onTouchEnd(e: TouchEvent): void {
        const touches = Array.from(e.touches).map(t => ({
            id: t.identifier,
            x: t.clientX,
            y: t.clientY,
            force: t.force
        }));

        const event: TouchEndEvent = {
            type: 'touchend',
            timestamp: Date.now(),
            touches
        };

        this.inputManager.processEvent(event);
    }
}