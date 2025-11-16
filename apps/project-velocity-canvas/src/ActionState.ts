import {
    GameState, SystemContainer, CORE_SYSTEMS, PLATFORM_SYSTEMS,
    InputManager, RenderManager, AudioManager, EventBus
} from '@game-engine/core';

import { Player } from './Player';

interface VelocityGameData {
    player: Player | null;
    [key: string]: unknown;
}

export class ActionState extends GameState<VelocityGameData> {
    private container: SystemContainer;
    private inputManager!: InputManager;
    private renderManager!: RenderManager;
    private audioManager!: AudioManager;

    constructor(container: SystemContainer) {
        super('main', container.get(PLATFORM_SYSTEMS.Logger));
        this.container = container;
    }

    enter(): void {
        // 1. Get required systems from the container
        this.inputManager = this.container.get<InputManager>(PLATFORM_SYSTEMS.InputManager);
        this.renderManager = this.container.get<RenderManager>(PLATFORM_SYSTEMS.RenderManager);
        this.audioManager = this.container.get<AudioManager>(PLATFORM_SYSTEMS.AudioManager);

        // 2. Create the player and store it in the context
        this.context.game.player = new Player();

        // 3. ** EVENT-BASED Input for "action" **
        const eventBus = this.container.get<EventBus>(CORE_SYSTEMS.EventBus);
        eventBus.on('input.action', (event) => {
            if (event.action === 'action') {
                this.audioManager.playSound('punch_sfx');
            }
        });
    }

    // 4. ** CRITICAL: The update loop drives all polling-based logic **
    update(deltaTime: number): void {
        if (!this.context.game.player) return;

        // 5. ** POLLING-BASED input for "movement" **
        if (this.inputManager.isActionTriggered('move_left')) {
            this.context.game.player.move(-1, deltaTime);
        }
        if (this.inputManager.isActionTriggered('move_right')) {
            this.context.game.player.move(1, deltaTime);
        }

        // 6. Call the render method every frame
        this.render();
    }

    // 7. The render method pushes commands
    private render(): void {
        const player = this.context.game.player!;

        this.renderManager.pushSceneCommand({ type: 'clear' });
        this.renderManager.pushSceneCommand({
            type: 'sprite',
            id: 'player',
            assetId: 'player_sprite',
            x: player.x,
            y: player.y,
            width: 50,
            height: 50,
            zIndex: 10
        });
    }
}
