import {
    Engine, BrowserPlatformAdapter, createCoreSystemDefinitions,
    createPlatformSystemDefinitions, CORE_SYSTEMS, PLATFORM_SYSTEMS,
    GameStateManager, AssetManager, InputManager, type AssetManifestEntry
} from '@game-engine/core';

import { ActionState } from './ActionState';
import { Player } from './Player';

interface VelocityGameData {
    player: Player | null;
    [key: string]: unknown;
}

// 1. Define the Asset Manifest
const ASSET_MANIFEST: AssetManifestEntry[] = [
    { "id": "player_sprite", "url": "https://placehold.co/50x50/00ff00/000000?text=P", "type": "image" },
    { "id": "punch_sfx", "url": "https://actions.google.com/sounds/v1/cartoon/punch.mp3", "type": "audio" }
];

async function main() {
    // 2. Create the Platform (Canvas)
    const platform = new BrowserPlatformAdapter({
        containerElement: document.getElementById('game-canvas')!,
        renderType: 'canvas', // Use Canvas renderer
        audio: true,
        input: true
    });

    // 3. Create the Engine
    const engine = new Engine({
        platform, gameVersion: '1.0.0',
        gameState: { player: null } as VelocityGameData
    });

    // 4. Assemble Systems
    const coreDefs = createCoreSystemDefinitions();
    const platformDefs = createPlatformSystemDefinitions(platform, {
        assets: true, audio: true, input: true, renderer: { type: 'canvas' }
    });
    [...coreDefs, ...platformDefs].forEach(def => engine.container.register(def));

    // 5. Initialize Systems
    await engine.initializeSystems();

    // 6. CRITICAL: Load Assets
    const assetManager = engine.container.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
    await assetManager.loadManifest(ASSET_MANIFEST);

    // 7. Register Game-Specific Input Actions
    const inputManager = engine.container.get<InputManager>(PLATFORM_SYSTEMS.InputManager);
    inputManager.registerAction('move_left', [{ type: 'key', input: 'a' }]);
    inputManager.registerAction('move_right', [{ type: 'key', input: 'd' }]);
    inputManager.registerAction('action', [{ type: 'key', input: ' ' }]); // Spacebar

    // 8. Register Game State
    const stateManager = engine.container.get<GameStateManager>(CORE_SYSTEMS.StateManager);
    stateManager.register('main', new ActionState(engine.container));

    // 9. Start the Engine
    // We must unlock audio on a user click, but for this test, we can try.
    engine.unlockAudio(); // Will likely warn, but is correct practice
    engine.start('main');
}
main().catch(console.error);
