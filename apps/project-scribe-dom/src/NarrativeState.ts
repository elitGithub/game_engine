import {
    GameState, SystemContainer, CORE_SYSTEMS, PLATFORM_SYSTEMS,
    SceneManager, RenderManager, UIRenderer, EventBus,
    type GameContext,
    type PositionedDialogue, type PositionedChoice
} from '@game-engine/core';

// Define the shape of our game's state (TGame)
interface ScribeGameData {
    lastScene: string | null;
    [key: string]: unknown;
}

/**
 * The core logic for Project Scribe (DOM Version).
 * This state is 100% event-driven. Its update() loop is empty.
 * It acts as a "dumb" pass-through, taking data from SceneManager
 * and passing it directly to the UIRenderer.
 */
export class NarrativeState extends GameState<ScribeGameData> {

    // System references
    private container: SystemContainer;
    private sceneManager!: SceneManager;
    private renderManager!: RenderManager;
    private uiRenderer: UIRenderer;

    constructor(container: SystemContainer) {
        super('main', container.get(PLATFORM_SYSTEMS.Logger));
        this.container = container;
        this.uiRenderer = new UIRenderer(); // UI Renderer is a "part" from the bag
    }

    enter(): void {
        // 1. Get required systems from the container
        this.sceneManager = this.container.get<SceneManager>(CORE_SYSTEMS.SceneManager);
        this.renderManager = this.container.get<RenderManager>(PLATFORM_SYSTEMS.RenderManager);

        // 2. ** INPUT LOGIC: Subscribe to 'input.hotspot' **
        // This event is automatically emitted by the DomRenderer.
        const eventBus = this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
        eventBus.on('input.hotspot', this.onHotspotClick.bind(this));

        // 3. Go to the first scene
        this.sceneManager.goToScene('scene_1', this.context as unknown as GameContext);
        this.renderCurrentScene();
    }

    // 4. This is the "framework" logic. It's a simple pass-through.
    // It reads pre-positioned data from the scene and gives it to the renderer.
    private renderCurrentScene(): void {
        const scene = this.sceneManager.getCurrentScene();
        if (!scene) return;

        // The sceneData *is* the layout configuration
        const dialogueData = scene.sceneData.dialogue as PositionedDialogue;
        const choiceData = scene.sceneData.choices as unknown as PositionedChoice[];

        // Build commands by passing data directly to helpers
        const dialogueCommands = this.uiRenderer.buildDialogueCommands(dialogueData);
        const choiceCommands = this.uiRenderer.buildChoiceCommands(choiceData || []);

        // Push to the render queue
        this.renderManager.pushUICommand({ type: 'clear' });
        dialogueCommands.forEach(cmd => this.renderManager.pushUICommand(cmd));
        choiceCommands.forEach(cmd => this.renderManager.pushUICommand(cmd));
    }

    // 5. ** This is the event handler for DOM-based hotspots **
    private onHotspotClick(event: { element: unknown; data: Record<string, string> }): void {
        // The DomInputAdapter automatically finds and passes the 'data-' attributes
        if (event.data && event.data.targetScene) {
            const targetScene = event.data.targetScene as string;

            // 6. Transition scene and re-render
            this.sceneManager.goToScene(targetScene, this.context as unknown as GameContext);
            this.renderCurrentScene();
        }
    }

    // 7. CRITICAL: The update loop is empty for this framework.
    update(_deltaTime: number): void {
        // Do nothing. This is not a real-time game.
    }
}
