import type {RenderCommand, IRenderer} from '../types/RenderingTypes';
import type {EventBus} from '../core/EventBus';
import type { ILogger, IRenderContainer } from '@engine/interfaces';

/**
 * RenderManager - Rendering facade
 *
 * Manages render command queues and delegates rendering to an IRenderer implementation.
 * The renderer is injected as a dependency through SystemContainer.
 *
 * Follows the same pattern as AudioManager (gold standard):
 * - Receives platform-specific implementation via constructor
 * - Self-contained facade over that implementation
 * - No internal registry or factory logic
 */
export class RenderManager {
    private renderer: IRenderer;
    private sceneQueue: RenderCommand[] = [];
    private uiQueue: RenderCommand[] = [];

    constructor(
        _config: { type: string },
        _eventBus: EventBus,
        container: IRenderContainer,
        renderer: IRenderer,
        _logger: ILogger
    ) {
        this.renderer = renderer;
        this.renderer.init(container);
    }

    pushSceneCommand(command: RenderCommand): void {
        this.sceneQueue.push(command);
    }

    pushUICommand(command: RenderCommand): void {
        this.uiQueue.push(command);
    }

    private sortCommands(commands: RenderCommand[]): RenderCommand[] {
        const getZ = (cmd: RenderCommand): number => {
            if (cmd.type === 'clear') return -Infinity;
            return cmd.zIndex || 0;
        }
        return commands
            .filter(cmd => cmd.type !== 'clear')
            .sort((a, b) => getZ(a) - getZ(b));
    }

    flush(): void {
        // Check if either queue has a 'clear' command
        const needsClear = this.sceneQueue.some(cmd => cmd.type === 'clear') ||
                           this.uiQueue.some(cmd => cmd.type === 'clear');

        if (needsClear) {
            this.renderer.clear();
        }

        // 1. Sort and flush the SCENE queue
        const sortedSceneCommands = this.sortCommands(this.sceneQueue);
        if (sortedSceneCommands.length > 0) {
            this.renderer.flush(sortedSceneCommands);
        }

        // 2. Sort and flush the UI queue
        const sortedUICommands = this.sortCommands(this.uiQueue);
        if (sortedUICommands.length > 0) {
            this.renderer.flush(sortedUICommands);
        }

        // 3. Clear both queues
        this.sceneQueue = [];
        this.uiQueue = [];
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