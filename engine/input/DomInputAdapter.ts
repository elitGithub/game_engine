// engine/core/DomInputAdapter.ts
import { BaseInputAdapter } from './BaseInputAdapter';
import type {
    InputAdapterType,
    InputAttachOptions,
    InputCapabilities
} from '@engine/interfaces';
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
} from '@engine/types/InputEvents';
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
    private readonly boundListeners: Map<string, EventListener>;

    // Cached bound event handlers
    private readonly onKeyDownBound: EventListener;
    private readonly onKeyUpBound: EventListener;
    private readonly onMouseDownBound: EventListener;
    private readonly onMouseUpBound: EventListener;
    private readonly onMouseMoveBound: EventListener;
    private readonly onWheelBound: EventListener;
    private readonly onClickBound: EventListener;
    private readonly onTouchStartBound: EventListener;
    private readonly onTouchMoveBound: EventListener;
    private readonly onTouchEndBound: EventListener;

    constructor(private readonly logger: ILogger) {
        super();
        this.targetElement = null;
        this.boundListeners = new Map();

        // Cache bound functions to avoid creating new functions on each attach
        this.onKeyDownBound = this.onKeyDown.bind(this) as EventListener;
        this.onKeyUpBound = this.onKeyUp.bind(this) as EventListener;
        this.onMouseDownBound = this.onMouseDown.bind(this) as EventListener;
        this.onMouseUpBound = this.onMouseUp.bind(this) as EventListener;
        this.onMouseMoveBound = this.onMouseMove.bind(this) as EventListener;
        this.onWheelBound = this.onWheel.bind(this) as EventListener;
        this.onClickBound = this.onClick.bind(this) as EventListener;
        this.onTouchStartBound = this.onTouchStart.bind(this) as EventListener;
        this.onTouchMoveBound = this.onTouchMove.bind(this) as EventListener;
        this.onTouchEndBound = this.onTouchEnd.bind(this) as EventListener;
    }

    getType(): InputAdapterType {
        return 'dom';
    }

    /**
     * Attach to a render container that implements IRenderContainer
     */
    attach(container?: IRenderContainer, options?: InputAttachOptions): boolean {
        // If already attached, detach first
        if (this.attached) {
            this.detach();
        }

        let element: HTMLElement | undefined;

        // Try to get HTMLElement from container
        if (container) {
            // Check if it's a DOM-capable render container
            if (isDomRenderContainer(container)) {
                element = (container as IDomRenderContainer).getElement();
            } else {
                this.logger.warn('[DomInputAdapter] Container does not implement IDomRenderContainer. Skipping.');
                return false;
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

        // Use cached bound functions
        const onKeyDown = this.onKeyDownBound;
        const onKeyUp = this.onKeyUpBound;
        const onMouseDown = this.onMouseDownBound;
        const onMouseUp = this.onMouseUpBound;
        const onMouseMove = this.onMouseMoveBound;
        const onWheel = this.onWheelBound;
        const onClick = this.onClickBound;
        const onTouchStart = this.onTouchStartBound;
        const onTouchMove = this.onTouchMoveBound;
        const onTouchEnd = this.onTouchEndBound;

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

        this.boundListeners.set('keydown', onKeyDown as EventListener);
        this.boundListeners.set('keyup', onKeyUp as EventListener);
        this.boundListeners.set('mousedown', onMouseDown as EventListener);
        this.boundListeners.set('mouseup', onMouseUp as EventListener);
        this.boundListeners.set('mousemove', onMouseMove as EventListener);
        this.boundListeners.set('wheel', onWheel as EventListener);
        this.boundListeners.set('click', onClick as EventListener);
        this.boundListeners.set('touchstart', onTouchStart as EventListener);
        this.boundListeners.set('touchmove', onTouchMove as EventListener);
        this.boundListeners.set('touchend', onTouchEnd as EventListener);
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