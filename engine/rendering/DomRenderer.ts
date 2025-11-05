// engine/rendering/DomRenderer.ts

import type {IRenderer, RenderCommand} from '../types/RenderingTypes';
import {EventBus} from "@engine/core/EventBus.ts";

/**
 * DomRenderer - DOM-based IRenderer impl.
 *
 * Bridges RenderCommand to existing Sprite/TextRenderer.
 * Converts TextStyleData → DomTextStyle internally.
 * Emits to EventBus for decoupled input (e.g., hotspots).
 */
export class DomRenderer implements IRenderer {


    constructor(container: HTMLElement, eventBus: EventBus) {

    }

    init(container: HTMLElement): void {

    }

    clear(): void {

    }

    flush(commands: RenderCommand[]): void {
    }

    resize(width: number, height: number): void {

    }

    dispose(): void {

    }
}