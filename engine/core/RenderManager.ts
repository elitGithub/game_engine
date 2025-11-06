// engine/systems/RenderManager.ts

import type {RenderCommand, IRenderer} from '../types/RenderingTypes';
import {EventBus} from '../core/EventBus';
import type { SystemRegistry } from './SystemRegistry';

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
    private registry: SystemRegistry;

    constructor(
        config: { type: 'dom' | 'canvas' | 'svelte' },
        eventBus: EventBus,
        container: HTMLElement,
        registry: SystemRegistry
    ) {

        this.registry = registry; // Store registry
        this.renderer = this.registry.getRenderer(config.type);
        this.renderer.init(container);
    }

    pushCommand(command: RenderCommand): void {
        this.queue.push(command);
    }

    flush(): void {
        if (this.queue.length === 0) return;
        const commandsToFlush = this.queue.filter(cmd => cmd.type !== 'clear');
        if (this.queue.some(cmd => cmd.type === 'clear')) {
            this.renderer.clear();
        }

        this.renderer.flush(commandsToFlush);
        this.queue = [];
    }

    resize(width: number, height: number): void {
        if (this.renderer.resize) {
            this.renderer.resize(width, height);
        }
    }

    dispose(): void {
        this.renderer.dispose();
    }
}