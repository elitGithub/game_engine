import {
    Engine, BrowserPlatformAdapter, createCoreSystemDefinitions,
    createPlatformSystemDefinitions, CORE_SYSTEMS, PLATFORM_SYSTEMS,
    GameStateManager, SceneManager, AssetManager, Scene,
    type AssetManifestEntry
} from '@game-engine/core';
import { NarrativeState } from './NarrativeState';

// Define the shape of our game's state (TGame)
interface ScribeGameData {
    lastScene: string | null;
    [key: string]: unknown;
}

// 1. Define the Asset Manifest (Identical to Scribe-DOM)
const ASSET_MANIFEST: AssetManifestEntry[] = [
    { "id": "char1_portrait", "url": "https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1", "type": "image" },
    { "id": "game_data", "url": "./data/game-data.json", "type": "json" }
];

async function main() {
    // 2. Create the Platform (Canvas)
    const platform = new BrowserPlatformAdapter({
        containerElement: document.getElementById('game-canvas')!,
        renderType: 'canvas', // <-- THE CHANGE
        audio: false,
        input: true
    });

    // 3. Create the Engine
    const engine = new Engine({
        platform, gameVersion: '1.0.0',
        gameState: { lastScene: null } as ScribeGameData
    });

    // 4. Assemble Systems
    const coreDefs = createCoreSystemDefinitions();
    const platformDefs = createPlatformSystemDefinitions(platform, {
        assets: true, input: true, renderer: { type: 'canvas' } // <-- THE CHANGE
    });
    [...coreDefs, ...platformDefs].forEach(def => engine.container.register(def));

    // 5. Initialize Systems
    await engine.initializeSystems();

    // 6. CRITICAL: Load Assets
    const assetManager = engine.container.get<AssetManager>(PLATFORM_SYSTEMS.AssetManager);
    await assetManager.loadManifest(ASSET_MANIFEST);

    // 7. Load Game-Specific Data
    const sceneManager = engine.container.get<SceneManager>(CORE_SYSTEMS.SceneManager);
    const gameData = assetManager.get('game_data') as any;
    sceneManager.registerSceneFactory('story', (id, type, data) => new Scene(id, type, data));
    sceneManager.loadScenes(gameData.scenes);

    // 8. Register Game State
    const stateManager = engine.container.get<GameStateManager>(CORE_SYSTEMS.StateManager);
    stateManager.register('main', new NarrativeState(engine.container));

    // 9. Start the Engine
    engine.start('main');
}
main().catch(console.error);
