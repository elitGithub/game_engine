import type {RenderCommand, IRenderer} from '@game-engine/core/types/RenderingTypes';
import type {EventBus} from '@game-engine/core/core/EventBus';
import type { ILogger, IRenderContainer } from '@game-engine/core/interfaces';

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
    private readonly eventBus: EventBus;
    private readonly logger: ILogger;
    private sceneQueue: RenderCommand[] = [];
    private uiQueue: RenderCommand[] = [];

    constructor(
        config: { type: string },
        eventBus: EventBus,
        container: IRenderContainer,
        renderer: IRenderer,
        logger: ILogger
    ) {
        this.renderer = renderer;
        this.eventBus = eventBus;
        this.logger = logger;
        this.logger.log(`[RenderManager] Initializing ${config.type} renderer`);
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
        this.eventBus.emit('render.frame.start', {});

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

        const totalCommands = sortedSceneCommands.length + sortedUICommands.length;
        this.eventBus.emit('render.frame.end', { commandCount: totalCommands });

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