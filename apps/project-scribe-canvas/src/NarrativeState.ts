import {
    GameState, SystemContainer, CORE_SYSTEMS, PLATFORM_SYSTEMS,
    SceneManager, RenderManager, UIRenderer, EventBus,
    type ClickEvent, type PositionedChoice, type GameContext,
    type PositionedDialogue
} from '@game-engine/core';

interface ScribeGameData {
    lastScene: string | null;
    [key: string]: unknown;
}

export class NarrativeState extends GameState<ScribeGameData> {
    private container: SystemContainer;
    private sceneManager!: SceneManager;
    private renderManager!: RenderManager;
    private uiRenderer: UIRenderer;
    private currentChoices: PositionedChoice[] = [];

    constructor(container: SystemContainer) {
        super('main', container.get(PLATFORM_SYSTEMS.Logger));
        this.container = container;
        this.uiRenderer = new UIRenderer();
    }

    enter(): void {
        this.sceneManager = this.container.get<SceneManager>(CORE_SYSTEMS.SceneManager);
        this.renderManager = this.container.get<RenderManager>(PLATFORM_SYSTEMS.RenderManager);

        // ** INPUT LOGIC: Subscribe to 'input.click' **
        // The CanvasRenderer doesn't emit 'hotspot' events. We get raw clicks.
        const eventBus = this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
        eventBus.on('input.click', this.onCanvasClick.bind(this));

        this.sceneManager.goToScene('scene_1', this.context as unknown as GameContext);
        this.renderCurrentScene();
    }

    // This render logic is IDENTICAL to Scribe-DOM.
    // This proves the UIRenderer -> RenderManager -> Renderer abstraction works.
    private renderCurrentScene(): void {
        const scene = this.sceneManager.getCurrentScene();
        if (!scene) return;

        const dialogueData = scene.sceneData.dialogue as PositionedDialogue;
        const choiceData = (scene.sceneData.choices || []) as unknown as PositionedChoice[];

        // Store choices for hit-testing
        this.currentChoices = choiceData;

        const dialogueCommands = this.uiRenderer.buildDialogueCommands(dialogueData);
        const choiceCommands = this.uiRenderer.buildChoiceCommands(choiceData);

        this.renderManager.pushUICommand({ type: 'clear' });
        dialogueCommands.forEach(cmd => this.renderManager.pushUICommand(cmd));
        choiceCommands.forEach(cmd => this.renderManager.pushUICommand(cmd));
    }

    // ** This is the event handler for CANVAS-based clicks **
    private onCanvasClick(event: ClickEvent): void {
        const { x, y } = event;

        // Manual Hit-Testing using the data from game-data.json
        for (const choice of this.currentChoices) {
            const h = choice.hotspot;
            if (x >= h.x && x <= h.x + h.width && y >= h.y && y <= h.y + h.height) {
                // We have a hit!
                if (choice.data && choice.data.targetScene) {
                    const targetScene = choice.data.targetScene as string;
                    this.sceneManager.goToScene(targetScene, this.context as unknown as GameContext);
                    this.renderCurrentScene();
                    return; // Stop checking
                }
            }
        }
    }

    // CRITICAL: The update loop is empty.
    update(_deltaTime: number): void {}
}
