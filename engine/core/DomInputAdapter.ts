// engine/core/DomInputAdapter.ts
import {
    BaseInputAdapter,
    type InputAdapterType,
    type InputAttachOptions,
    type InputCapabilities
} from '../interfaces/IInputAdapter';
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
import {ILogger, IRenderContainer, IDomRenderContainer, isDomRenderContainer} from "@engine/interfaces";

/**
 * DomInputAdapter - Translates DOM events to engine-agnostic input events
 *
 * Implements IInputAdapter for DOM-based input (keyboard, mouse, touch).
 *
 * This adapter is responsible for:
 * - Attaching/detaching DOM event listeners
 * - Translating KeyboardEvent, MouseEvent, TouchEvent to engine events
 * - Managing the lifecycle of DOM-specific resources
 *
 * The InputManager remains platform-independent and only processes engine events.
 *
 * Platform requirements: Requires IDomRenderContainer or HTMLElement
 */
export class DomInputAdapter extends BaseInputAdapter {
    private targetElement: HTMLElement | null;
    private boundListeners: Map<string, (evt: any) => void>;

    constructor(private logger: ILogger) {
        super();
        this.targetElement = null;
        this.boundListeners = new Map();
    }

    getType(): InputAdapterType {
        return 'dom';
    }

    /**
     * Attach to a render container or platform container
     */
    attach(container?: IRenderContainer | PlatformContainer, options?: InputAttachOptions): boolean {
        // If already attached, detach first
        if (this.attached) {
            this.detach();
        }

        let element: HTMLElement | undefined;

        // Try to get HTMLElement from container
        if (container) {
            // Check if it's an IRenderContainer
            if (isDomRenderContainer(container as IRenderContainer)) {
                element = (container as IDomRenderContainer).getElement();
            }
            // Check if it's a legacy PlatformContainer
            else if ((container as PlatformContainer).getDomElement) {
                element = (container as PlatformContainer).getDomElement?.();
            }
        }

        if (!element) {
            this.logger.warn('[DomInputAdapter] Container does not provide DOM element. Skipping.');
            return false;
        }

        this.targetElement = element;

        // Set tabindex for keyboard input
        const tabindex = options?.tabindex ?? '0';
        if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', tabindex);
        }

        this.attachListeners();

        // Focus if requested
        if (options?.focus) {
            element.focus();
        }

        this.attached = true;
        return true;
    }

    /**
     * Legacy attach to HTML element (direct usage)
     * @deprecated Use attach(container, options) instead
     */
    attachToElement(element: HTMLElement, options?: { focus?: boolean; tabindex?: string }): void {
        if (this.attached) {
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

        this.attached = true;
    }

    /**
     * Legacy attach to platform container
     * @deprecated Use attach(container, options) instead
     */
    attachToContainer(container: PlatformContainer, options?: { focus?: boolean; tabindex?: string }): boolean {
        const element = container.getDomElement?.();
        if (!element) {
            this.logger.warn('[DomInputAdapter] Container does not provide DOM element. Skipping.');
            return false;
        }

        this.attachToElement(element, options);
        return true;
    }

    detach(): void {
        if (!this.targetElement) return;

        this.boundListeners.forEach((listener, event) => {
            this.targetElement!.removeEventListener(event, listener);
        });
        this.boundListeners.clear();

        this.targetElement = null;
        this.attached = false;
    }

    getCapabilities(): InputCapabilities {
        return {
            keyboard: true,
            mouse: true,
            touch: true,
            gamepad: false
        };
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
            timestamp: e.timeStamp,
            key: e.key,
            code: e.code,
            repeat: e.repeat,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.emitEvent(event);
    }

    private onKeyUp(e: KeyboardEvent): void {
        const event: KeyUpEvent = {
            type: 'keyup',
            timestamp: e.timeStamp,
            key: e.key,
            code: e.code,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.emitEvent(event);
    }

    // ============================================================================
    // MOUSE EVENT TRANSLATION
    // ============================================================================

    private onMouseDown(e: MouseEvent): void {
        const event: MouseDownEvent = {
            type: 'mousedown',
            timestamp: e.timeStamp,
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.emitEvent(event);
    }

    private onMouseUp(e: MouseEvent): void {
        const event: MouseUpEvent = {
            type: 'mouseup',
            timestamp: e.timeStamp,
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            shift: e.shiftKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            meta: e.metaKey
        };

        this.emitEvent(event);
    }

    private onMouseMove(e: MouseEvent): void {
        const event: MouseMoveEvent = {
            type: 'mousemove',
            timestamp: e.timeStamp,
            x: e.clientX,
            y: e.clientY,
            deltaX: e.movementX,
            deltaY: e.movementY,
            buttons: e.buttons
        };

        this.emitEvent(event);
    }

    private onWheel(e: WheelEvent): void {
        const event: MouseWheelEvent = {
            type: 'wheel',
            timestamp: e.timeStamp,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            x: e.clientX,
            y: e.clientY
        };

        this.emitEvent(event);
    }

    private onClick(e: MouseEvent): void {
        // Extract dataset if target is HTMLElement (DOM-specific logic stays here)
        let data: Record<string, string> | undefined;
        const target = e.target;
        if (target instanceof HTMLElement && target.dataset && Object.keys(target.dataset).length > 0) {
            data = {};
            for (const [key, value] of Object.entries(target.dataset)) {
                if (value !== undefined) {
                    data[key] = value;
                }
            }
        }

        const event: ClickEvent = {
            type: 'click',
            timestamp: e.timeStamp,
            button: e.button,
            x: e.clientX,
            y: e.clientY,
            target: e.target,
            data // Pass extracted data to platform-agnostic event
        };

        this.emitEvent(event);
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
            timestamp: e.timeStamp,
            touches
        };

        this.emitEvent(event);
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
            timestamp: e.timeStamp,
            touches
        };

        this.emitEvent(event);
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
            timestamp: e.timeStamp,
            touches
        };

        this.emitEvent(event);
    }
}