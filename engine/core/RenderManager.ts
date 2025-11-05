// engine/systems/RenderManager.ts

import type {RenderCommand, IRenderer} from '../types/RenderingTypes';
import {EventBus} from '../core/EventBus';

/**
 * RenderManager - Engine-level manager for rendering.
 *
 * Responsibilities:
 * 1. Owns one IRenderer instance (swappable via config)
 * 2. Owns the render command queue
 * 3. Called by Engine.gameLoop() to flush
 * 4. Exposed to GameContext as `context.render`
 */
export class RenderManager {
    private renderer: IRenderer;
    private queue: RenderCommand[] = [];
    private eventBus: EventBus;
    private container: HTMLElement;

    constructor(
        config: { type: 'dom' | 'canvas' | 'svelte' },
        eventBus: EventBus,
        container: HTMLElement
    ) {
        this.eventBus = eventBus;
        this.container = container;
        this.renderer = this.createRenderer(config.type);
        this.renderer.init(container);
    }

    private createRenderer(type: string): IRenderer {
        switch (type) {
            case 'dom':
                const {DomRenderer} = require('../rendering/DomRenderer');
                return new DomRenderer(this.container, this.eventBus);
            case 'canvas':
                const {CanvasRenderer} = require('../rendering/CanvasRenderer');
                return new CanvasRenderer(this.container, this.eventBus);
            default:
                throw new Error(`Unknown renderer type: ${type}`);
        }
    }

    pushCommand(command: RenderCommand): void {
        this.queue.push(command);
    }

    flush(): void {
        if (this.queue.length === 0) return;
        this.renderer.clear();
        this.renderer.flush(this.queue);
        this.queue = [];
    }

    resize(width: number, height: number): void {
        this.renderer.resize(width, height);
    }

    dispose(): void {
        this.renderer.dispose();
    }
}