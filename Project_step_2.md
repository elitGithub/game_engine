Document Status: ACTIONABLE  
Author: Senior System Architect  
Date: 2025-11-16  
Version: 1.6.0

## **1.0 Objective**

This document is the **exact specification** for the "Proof of Duality" task. Its goal is to validate that the @game-engine/core library is flexible enough to power fundamentally different game architectures *without modification*.

We will build **three** minimal applications to prove this duality on two axes:

1. **Logic Duality:** Event-Driven (Scribe) vs. Polling-Driven (Velocity).  
2. **Renderer Duality:** DOM-Rendered (Scribe-DOM) vs. Canvas-Rendered (Scribe-Canvas).

## **2.0 Task 0: Monorepo Setup**

1. **Create Directories:**  
   * apps/project-scribe-dom/src/data  
   * apps/project-scribe-canvas/src/data  
   * apps/project-velocity-canvas/src  
2. **Create Files:**  
   * For **all three** projects, create the required package.json, project.json, tsconfig.json, vite.config.ts, and index.html files. (See sections 4, 5, 6 for index.html content).  
   * Ensure each package.json includes "@game-engine/core": "workspace:^" in its dependencies.  
3. **Run npm install:** From the root directory, run npm install to link all workspace packages.

## **3.0 Core Principles (Non-Negotiable)**

1. **NO "STEP 1" MODIFICATIONS:** You **MUST NOT** modify any file under the packages/core/ directory.  
2. **MINIMALISM:** Implement *only* what is specified. Do not add features.

## **4.0 Framework A: "Project Scribe-DOM" (Logic Proof: Event-Driven)**

### **4.1 Objective**

Prove the engine's capability to power a static, **event-driven**, **DOM-rendered** application that is **100% configured from JSON**.

### **4.2 File: apps/project-scribe-dom/index.html (Copy-Paste)**

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8" /\>\<meta name="viewport" content="width=device-width, initial-scale=1.0" /\>  
    \<title\>Project Scribe (DOM)\</title\>  
    \<style\>  
      body, html { margin: 0; padding: 0; background: \#111; }  
      \#game-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; }  
    \</style\>  
\</head\>  
\<body\>  
    \<div id="game-container"\>\</div\>  
    \<script type="module" src="/src/main.ts"\>\</script\>  
\</body\>  
\</html\>

### **4.3 File: apps/project-scribe-dom/src/main.ts (The "Assembler" \- Copy-Paste)**

This file is the "Step 2" framework assembler. Its order of operations correctly handles asset loading *before* starting the engine, solving the race condition.

import {  
    Engine, BrowserPlatformAdapter, createCoreSystemDefinitions,  
    createPlatformSystemDefinitions, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    GameStateManager, SceneManager, AssetManager, Scene,  
    type AssetManifestEntry  
} from '@game-engine/core';

import { NarrativeState } from './NarrativeState';

// Define the shape of our game's state (TGame)  
interface ScribeGameData { lastScene: string | null; }

// 1\. Define the Asset Manifest IN CODE. This is the configuration.  
const ASSET\_MANIFEST: AssetManifestEntry\[\] \= \[  
    { "id": "char1\_portrait", "url": "\[https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1\](https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1)", "type": "image" },  
    { "id": "game\_data", "url": "./data/game-data.json", "type": "json" }  
\];

// The main assembly function  
async function main() {  
    // 2\. Create the Platform (DOM)  
    const platform \= new BrowserPlatformAdapter({  
        containerElement: document.getElementById('game-container')\!,  
        renderType: 'dom', // Use DOM renderer  
        audio: false,      // Audio disabled for this test  
        input: true        // Input enabled for hotspots  
    });

    // 3\. Create the Engine  
    const engine \= new Engine({  
        platform, gameVersion: '1.0.0',  
        gameState: { lastScene: null } as ScribeGameData  
    });

    // 4\. Assemble the "Bag of Parts"  
    const coreDefs \= createCoreSystemDefinitions();  
    const platformDefs \= createPlatformSystemDefinitions(platform, {  
        assets: true,  
        input: true,  
        renderer: { type: 'dom' }  
    });

    \[...coreDefs, ...platformDefs\].forEach(def \=\> engine.container.register(def));

    // 5\. Initialize Systems  
    await engine.initializeSystems();

    // 6\. \*\*\* CRITICAL: LOAD ASSETS \*\*\*  
    // We MUST await this \*after\* initialization but \*before\* starting.  
    // This prevents the race condition.  
    const assetManager \= engine.container.get\<AssetManager\>(PLATFORM\_SYSTEMS.AssetManager);  
    await assetManager.loadManifest(ASSET\_MANIFEST);

    // 7\. Load Game-Specific Data (now that it's in the cache)  
    const sceneManager \= engine.container.get\<SceneManager\>(CORE\_SYSTEMS.SceneManager);  
    const gameData \= assetManager.get('game\_data') as any; // Cast from JSON

    // Register a "dumb" scene factory that just passes data through  
    sceneManager.registerSceneFactory('story', (id, type, data) \=\> {  
        return new Scene(id, type, data);  
    });  
    sceneManager.loadScenes(gameData.scenes);

    // 8\. Register Game State(s)  
    const stateManager \= engine.container.get\<GameStateManager\>(CORE\_SYSTEMS.StateManager);  
    stateManager.register('main', new NarrativeState(engine.container));

    // 9\. Start the Engine  
    engine.start('main');  
}

main().catch(console.error);

### **4.4 File: apps/project-scribe-dom/src/data/game-data.json (Copy-Paste)**

This file is **pure configuration**. It *is* the layout. It contains the exact PositionedDialogue and PositionedChoice data structures that the UIRenderer helpers expect.

{  
  "scenes": {  
    "scene\_1": {  
      "sceneType": "story",  
      "dialogue": {  
        "id": "scene1\_dialogue",  
        "background": { "x": 50, "y": 450, "width": 700, "height": 150, "fill": "rgba(0,0,0,0.7)" },  
        "portrait": { "assetId": "char1\_portrait", "x": 540, "y": 240, "width": 200, "height": 200 },  
        "speaker": { "text": "Character 1", "x": 60, "y": 465, "style": { "color": "red", "fontSize": "20px", "fontFamily": "Arial" } },  
        "text": { "text": "This is the first scene. Do you want to go to scene 2?", "x": 60, "y": 500, "style": { "color": "white", "fontSize": "18px", "fontFamily": "Arial" } },  
        "zIndex": 10000  
      },  
      "choices": \[  
        {  
          "id": "s1\_c1",  
          "text": "Yes, go to Scene 2",  
          "textPos": { "x": 60, "y": 550 },  
          "hotspot": { "x": 50, "y": 540, "width": 200, "height": 30 },  
          "data": { "targetScene": "scene\_2" },  
          "style": { "color": "\#00ff00", "fontSize": "16px", "fontFamily": "Arial" }  
        }  
      \]  
    },  
    "scene\_2": {  
      "sceneType": "story",  
      "dialogue": {  
        "id": "scene2\_dialogue",  
        "background": { "x": 50, "y": 450, "width": 700, "height": 150, "fill": "rgba(0,0,0,0.7)" },  
        "speaker": { "text": "Narrator", "x": 60, "y": 465, "style": { "color": "white", "fontSize": "20px", "fontFamily": "Arial" } },  
        "text": { "text": "This is the second scene. There is no escape.", "x": 60, "y": 500, "style": { "color": "white", "fontSize": "18px", "fontFamily": "Arial" } },  
        "zIndex": 10000  
      },  
      "choices": \[  
        {  
          "id": "s2\_c1",  
          "text": "Go back to Scene 1",  
          "textPos": { "x": 60, "y": 550 },  
          "hotspot": { "x": 50, "y": 540, "width": 200, "height": 30 },  
          "data": { "targetScene": "scene\_1" },  
          "style": { "color": "\#ffaa00", "fontSize": "16px", "fontFamily": "Arial" }  
        }  
      \]  
    }  
  }  
}

### **4.5 File: apps/project-scribe-dom/src/NarrativeState.ts (Copy-Paste)**

This file contains the "dumb" pass-through logic. It listens for 'input.hotspot' events, which the DomRenderer provides for free.

import {  
    GameState, SystemContainer, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    SceneManager, RenderManager, UIRenderer,  
    type TypedGameContext, type ClickEvent, type Scene,  
    type PositionedDialogue, type PositionedChoice  
} from '@game-engine/core';

// Define the shape of our game's state (TGame)  
interface ScribeGameData { lastScene: string | null; }

/\*\*  
 \* The core logic for Project Scribe (DOM Version).  
 \* This state is 100% event-driven. Its update() loop is empty.  
 \* It acts as a "dumb" pass-through, taking data from SceneManager  
 \* and passing it directly to the UIRenderer.  
 \*/  
export class NarrativeState extends GameState\<ScribeGameData\> {  
      
    // System references  
    private container: SystemContainer;  
    private sceneManager\!: SceneManager;  
    private renderManager\!: RenderManager;  
    private uiRenderer: UIRenderer;

    constructor(container: SystemContainer) {  
        super('main', container.get(PLATFORM\_SYSTEMS.Logger));  
        this.container \= container;  
        this.uiRenderer \= new UIRenderer(); // UI Renderer is a "part" from the bag  
    }

    enter(): void {  
        // 1\. Get required systems from the container  
        this.sceneManager \= this.container.get\<SceneManager\>(CORE\_SYSTEMS.SceneManager);  
        this.renderManager \= this.container.get\<RenderManager\>(PLATFORM\_SYSTEMS.RenderManager);

        // 2\. \*\* INPUT LOGIC: Subscribe to 'input.hotspot' \*\*  
        // This event is automatically emitted by the DomRenderer.  
        const eventBus \= this.container.get(CORE\_SYSTEMS.EventBus);  
        eventBus.on('input.hotspot', this.onHotspotClick.bind(this));

        // 3\. Go to the first scene  
        this.sceneManager.goToScene('scene\_1', this.context as TypedGameContext\<ScribeGameData\>);  
        this.renderCurrentScene();  
    }

    // 4\. This is the "framework" logic. It's a simple pass-through.  
    // It reads pre-positioned data from the scene and gives it to the renderer.  
    private renderCurrentScene(): void {  
        const scene \= this.sceneManager.getCurrentScene();  
        if (\!scene) return;

        // The sceneData \*is\* the layout configuration  
        const dialogueData \= scene.sceneData.dialogue as PositionedDialogue;  
        const choiceData \= scene.sceneData.choices as PositionedChoice\[\];

        // Build commands by passing data directly to helpers  
        const dialogueCommands \= this.uiRenderer.buildDialogueCommands(dialogueData);  
        const choiceCommands \= this.uiRenderer.buildChoiceCommands(choiceData || \[\]);

        // Push to the render queue  
        this.renderManager.pushUICommand({ type: 'clear' });  
        dialogueCommands.forEach(cmd \=\> this.renderManager.pushUICommand(cmd));  
        choiceCommands.forEach(cmd \=\> this.renderManager.pushUICommand(cmd));  
    }

    // 5\. \*\* This is the event handler for DOM-based hotspots \*\*  
    private onHotspotClick(event: ClickEvent): void {  
        // The DomInputAdapter automatically finds and passes the 'data-' attributes  
        if (event.data && event.data.targetScene) {  
            const targetScene \= event.data.targetScene as string;  
              
            // 6\. Transition scene and re-render  
            this.sceneManager.goToScene(targetScene, this.context as TypedGameContext\<ScribeGameData\>);  
            this.renderCurrentScene();  
        }  
    }

    // 7\. CRITICAL: The update loop is empty for this framework.  
    update(deltaTime: number): void {  
        // Do nothing. This is not a real-time game.  
    }  
}

### **4.6 Acceptance Criteria**

* **DONE** when scene\_1 loads.  
* **DONE** when dialogue, portrait, and choice are visible.  
* **DONE** when clicking the choice hotspot triggers the onHotspotClick handler.  
* **DONE** when SceneManager transitions to scene\_2.  
* **DONE** when scene\_2's text and choice are rendered.  
* **DONE** when clicking "Go back to Scene 1" works.

## **5.0 Framework B: "Project Scribe-Canvas" (Renderer Duality Proof)**

### **5.1 Objective**

Prove the **same** event-driven, data-driven logic from Scribe-DOM works on a **CanvasRenderer** by only changing the input-handling mechanism.

### **5.2 File: apps/project-scribe-canvas/index.html (Copy-Paste)**

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8" /\>\<meta name="viewport" content="width=device-width, initial-scale=1.0" /\>  
    \<title\>Project Scribe (Canvas)\</title\>  
    \<style\>  
      body, html { margin: 0; padding: 0; background: \#111; overflow: hidden; }  
      \#game-canvas { display: block; width: 100vw; height: 100vh; }  
    \</style\>  
\</head\>  
\<body\>  
    \<canvas id="game-canvas"\>\</canvas\>  
    \<script type="module" src="/src/main.ts"\>\</script\>  
\</body\>  
\</html\>

### **5.3 File: apps/project-scribe-canvas/src/main.ts (Copy-Paste)**

This is **identical** to Scribe-DOM's main.ts *except* for renderType and platformDefs.

import {  
    Engine, BrowserPlatformAdapter, createCoreSystemDefinitions,  
    createPlatformSystemDefinitions, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    GameStateManager, SceneManager, AssetManager, Scene,  
    type AssetManifestEntry  
} from '@game-engine/core';  
import { NarrativeState } from './NarrativeState';

// Define the shape of our game's state (TGame)  
interface ScribeGameData { lastScene: string | null; }

// 1\. Define the Asset Manifest (Identical to Scribe-DOM)  
const ASSET\_MANIFEST: AssetManifestEntry\[\] \= \[  
    { "id": "char1\_portrait", "url": "\[https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1\](https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1)", "type": "image" },  
    { "id": "game\_data", "url": "./data/game-data.json", "type": "json" }  
\];

async function main() {  
    // 2\. Create the Platform (Canvas)  
    const platform \= new BrowserPlatformAdapter({  
        containerElement: document.getElementById('game-canvas')\!,  
        renderType: 'canvas', // \<-- THE CHANGE  
        audio: false,  
        input: true  
    });

    // 3\. Create the Engine  
    const engine \= new Engine({  
        platform, gameVersion: '1.0.0',  
        gameState: { lastScene: null } as ScribeGameData  
    });

    // 4\. Assemble Systems  
    const coreDefs \= createCoreSystemDefinitions();  
    const platformDefs \= createPlatformSystemDefinitions(platform, {  
        assets: true, input: true, renderer: { type: 'canvas' } // \<-- THE CHANGE  
    });  
    \[...coreDefs, ...platformDefs\].forEach(def \=\> engine.container.register(def));

    // 5\. Initialize Systems  
    await engine.initializeSystems();

    // 6\. CRITICAL: Load Assets  
    const assetManager \= engine.container.get\<AssetManager\>(PLATFORM\_SYSTEMS.AssetManager);  
    await assetManager.loadManifest(ASSET\_MANIFEST);

    // 7\. Load Game-Specific Data  
    const sceneManager \= engine.container.get\<SceneManager\>(CORE\_SYSTEMS.SceneManager);  
    const gameData \= assetManager.get('game\_data') as any;  
    sceneManager.registerSceneFactory('story', (id, type, data) \=\> new Scene(id, type, data));  
    sceneManager.loadScenes(gameData.scenes);

    // 8\. Register Game State  
    const stateManager \= engine.container.get\<GameStateManager\>(CORE\_SYSTEMS.StateManager);  
    stateManager.register('main', new NarrativeState(engine.container));

    // 9\. Start the Engine  
    engine.start('main');  
}  
main().catch(console.error);

### **5.4 File: apps/project-scribe-canvas/src/data/game-data.json**

*This file is **identical** to apps/project-scribe-dom/src/data/game-data.json. Copy-paste it.*

### **5.5 File: apps/project-scribe-canvas/src/NarrativeState.ts (Copy-Paste)**

This file is the **key difference**. It listens for 'input.click' and performs a manual hit-test, proving the UI abstractions are renderer-agnostic.

import {  
    GameState, SystemContainer, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    SceneManager, RenderManager, UIRenderer,  
    type TypedGameContext, type ClickEvent, type PositionedChoice,  
    type PositionedDialogue, type Scene  
} from '@game-engine/core';

interface ScribeGameData { lastScene: string | null; }

export class NarrativeState extends GameState\<ScribeGameData\> {  
    private container: SystemContainer;  
    private sceneManager\!: SceneManager;  
    private renderManager\!: RenderManager;  
    private uiRenderer: UIRenderer;  
    private currentChoices: PositionedChoice\[\] \= \[\];

    constructor(container: SystemContainer) {  
        super('main', container.get(PLATFORM\_SYSTEMS.Logger));  
        this.container \= container;  
        this.uiRenderer \= new UIRenderer();  
    }

    enter(): void {  
        this.sceneManager \= this.container.get\<SceneManager\>(CORE\_SYSTEMS.SceneManager);  
        this.renderManager \= this.container.get\<RenderManager\>(PLATFORM\_SYSTEMS.RenderManager);

        // \*\* INPUT LOGIC: Subscribe to 'input.click' \*\*  
        // The CanvasRenderer doesn't emit 'hotspot' events. We get raw clicks.  
        const eventBus \= this.container.get(CORE\_SYSTEMS.EventBus);  
        eventBus.on('input.click', this.onCanvasClick.bind(this));

        this.sceneManager.goToScene('scene\_1', this.context as TypedGameContext\<ScribeGameData\>);  
        this.renderCurrentScene();  
    }

    // This render logic is IDENTICAL to Scribe-DOM.  
    // This proves the UIRenderer \-\> RenderManager \-\> Renderer abstraction works.  
    private renderCurrentScene(): void {  
        const scene \= this.sceneManager.getCurrentScene();  
        if (\!scene) return;

        const dialogueData \= scene.sceneData.dialogue as PositionedDialogue;  
        const choiceData \= (scene.sceneData.choices || \[\]) as PositionedChoice\[\];  
          
        // Store choices for hit-testing  
        this.currentChoices \= choiceData;

        const dialogueCommands \= this.uiRenderer.buildDialogueCommands(dialogueData);  
        const choiceCommands \= this.uiRenderer.buildChoiceCommands(choiceData);

        this.renderManager.pushUICommand({ type: 'clear' });  
        dialogueCommands.forEach(cmd \=\> this.renderManager.pushUICommand(cmd));  
        choiceCommands.forEach(cmd \=\> this.renderManager.pushUICommand(cmd));  
    }

    // \*\* This is the event handler for CANVAS-based clicks \*\*  
    private onCanvasClick(event: ClickEvent): void {  
        const { x, y } \= event;

        // Manual Hit-Testing using the data from game-data.json  
        for (const choice of this.currentChoices) {  
            const h \= choice.hotspot;  
            if (x \>= h.x && x \<= h.x \+ h.width && y \>= h.y && y \<= h.y \+ h.height) {  
                // We have a hit\!  
                if (choice.data && choice.data.targetScene) {  
                    const targetScene \= choice.data.targetScene as string;  
                    this.sceneManager.goToScene(targetScene, this.context as TypedGameContext\<ScribeGameData\>);  
                    this.renderCurrentScene();  
                    return; // Stop checking  
                }  
            }  
        }  
    }

    // CRITICAL: The update loop is empty.  
    update(deltaTime: number): void {}  
}

### **5.6 Acceptance Criteria**

* **DONE** when scene\_1 loads *on a canvas*.  
* **DONE** when dialogue, portrait, and choices are visible *on the canvas*.  
* **DONE** when clicking the *area* of the choice text triggers the onCanvasClick handler.  
* **DONE** when SceneManager transitions to scene\_2.  
* **DONE** when clicking "Go back to Scene 1" works.

## **6.0 Framework C: "Project Velocity-Canvas" (Logic Duality Proof)**

### **6.1 Objective**

Prove the engine's capability to power a real-time, 60fps, **polling-driven**, **Canvas-rendered** application.

### **6.2 File: apps/project-velocity-canvas/index.html (Copy-Paste)**

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8" /\>\<meta name="viewport" content="width=device-width, initial-scale=1.0" /\>  
    \<title\>Project Velocity (Canvas)\</title\>  
    \<style\>  
      body, html { margin: 0; padding: 0; background: \#111; overflow: hidden; }  
      \#game-canvas { display: block; width: 100vw; height: 100vh; background: \#333; }  
    \</style\>  
\</head\>  
\<body\>  
    \<canvas id="game-canvas"\>\</canvas\>  
    \<script type="module" src="/src/main.ts"\>\</script\>  
\</body\>  
\</html\>

### **6.3 File: apps/project-velocity-canvas/src/main.ts (The "Assembler" \- Copy-Paste)**

This file is the "Step 2" assembler for a real-time game.

import {  
    Engine, BrowserPlatformAdapter, createCoreSystemDefinitions,  
    createPlatformSystemDefinitions, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    GameStateManager, AssetManager, InputManager, type AssetManifestEntry  
} from '@game-engine/core';

import { ActionState } from './ActionState';  
import { Player } from './Player';

interface VelocityGameData { player: Player | null; }

// 1\. Define the Asset Manifest  
const ASSET\_MANIFEST: AssetManifestEntry\[\] \= \[  
    { "id": "player\_sprite", "url": "\[https://placehold.co/50x50/00ff00/000000?text=P\](https://placehold.co/50x50/00ff00/000000?text=P)", "type": "image" },  
    { "id": "punch\_sfx", "url": "\[https://actions.google.com/sounds/v1/cartoon/punch.mp3\](https://actions.google.com/sounds/v1/cartoon/punch.mp3)", "type": "audio" }  
\];

async function main() {  
    // 2\. Create the Platform (Canvas)  
    const platform \= new BrowserPlatformAdapter({  
        containerElement: document.getElementById('game-canvas')\!,  
        renderType: 'canvas', // Use Canvas renderer  
        audio: true,  
        input: true  
    });

    // 3\. Create the Engine  
    const engine \= new Engine({  
        platform, gameVersion: '1.0.0',  
        gameState: { player: null } as VelocityGameData  
    });

    // 4\. Assemble Systems  
    const coreDefs \= createCoreSystemDefinitions();  
    const platformDefs \= createPlatformSystemDefinitions(platform, {  
        assets: true, audio: true, input: true, renderer: { type: 'canvas' }  
    });  
    \[...coreDefs, ...platformDefs\].forEach(def \=\> engine.container.register(def));

    // 5\. Initialize Systems  
    await engine.initializeSystems();

    // 6\. CRITICAL: Load Assets  
    const assetManager \= engine.container.get\<AssetManager\>(PLATFORM\_SYSTEMS.AssetManager);  
    await assetManager.loadManifest(ASSET\_MANIFEST);

    // 7\. Register Game-Specific Input Actions  
    const inputManager \= engine.container.get\<InputManager\>(PLATFORM\_SYSTEMS.InputManager);  
    inputManager.registerAction('move\_left', \[{ type: 'key', input: 'a' }\]);  
    inputManager.registerAction('move\_right', \[{ type: 'key', input: 'd' }\]);  
    inputManager.registerAction('action', \[{ type: 'key', input: ' ' }\]); // Spacebar

    // 8\. Register Game State  
    const stateManager \= engine.container.get\<GameStateManager\>(CORE\_SYSTEMS.StateManager);  
    stateManager.register('main', new ActionState(engine.container));

    // 9\. Start the Engine  
    // We must unlock audio on a user click, but for this test, we can try.  
    engine.unlockAudio(); // Will likely warn, but is correct practice  
    engine.start('main');  
}  
main().catch(console.error);

### **6.4 File: apps/project-velocity-canvas/src/Player.ts (Copy-Paste)**

This is the simple data class for our game state.

export class Player {  
    x: number \= 400;  
    y: number \= 300;  
    speed: number \= 200;

    move(dir: number, dt: number) {  
        this.x \+= dir \* this.speed \* dt;  
    }  
}

### **6.5 File: apps/project-velocity-canvas/src/ActionState.ts (Copy-Paste)**

This file is the *opposite* of NarrativeState. The update() loop is the most important part.

import {  
    GameState, SystemContainer, CORE\_SYSTEMS, PLATFORM\_SYSTEMS,  
    InputManager, RenderManager, AudioManager, type TypedGameContext  
} from '@game-engine/core';

import { Player } from './Player';

interface VelocityGameData { player: Player | null; }

export class ActionState extends GameState\<VelocityGameData\> {  
    private container: SystemContainer;  
    private inputManager\!: InputManager;  
    private renderManager\!: RenderManager;  
    private audioManager\!: AudioManager;

    constructor(container: SystemContainer) {  
        super('main', container.get(PLATFORM\_SYSTEMS.Logger));  
        this.container \= container;  
    }

    enter(): void {  
        // 1\. Get required systems from the container  
        this.inputManager \= this.container.get\<InputManager\>(PLATFORM\_SYSTEMS.InputManager);  
        this.renderManager \= this.container.get\<RenderManager\>(PLATFORM\_SYSTEMS.RenderManager);  
        this.audioManager \= this.container.get\<AudioManager\>(PLATFORM\_SYSTEMS.AudioManager);

        // 2\. Create the player and store it in the context  
        this.context.game.player \= new Player();

        // 3\. \*\* EVENT-BASED Input for "action" \*\*  
        const eventBus \= this.container.get(CORE\_SYSTEMS.EventBus);  
        eventBus.on('input.action', (event) \=\> {  
            if (event.action \=== 'action') {  
                this.audioManager.playSound('punch\_sfx');  
            }  
        });  
    }

    // 4\. \*\* CRITICAL: The update loop drives all polling-based logic \*\*  
    update(deltaTime: number): void {  
        if (\!this.context.game.player) return;

        // 5\. \*\* POLLING-BASED input for "movement" \*\*  
        if (this.inputManager.isActionTriggered('move\_left')) {  
            this.context.game.player.move(-1, deltaTime);  
        }  
        if (this.inputManager.isActionTriggered('move\_right')) {  
            this.context.game.player.move(1, deltaTime);  
        }

        // 6\. Call the render method every frame  
        this.render();  
    }

    // 7\. The render method pushes commands  
    private render(): void {  
        const player \= this.context.game.player\!;

        this.renderManager.pushSceneCommand({ type: 'clear' });  
        this.renderManager.pushSceneCommand({  
            type: 'sprite',  
            id: 'player',  
            assetId: 'player\_sprite',  
            x: player.x,  
            y: player.y,  
            width: 50,  
            height: 50,  
            zIndex: 10  
        });  
    }  
}

### **6.6 Acceptance Criteria**

* **DONE** when a sprite renders on a \<canvas\>.  
* **DONE** when ActionState.update() is called every frame.  
* **DONE** when holding 'a' / 'd' keys moves the sprite (polling).  
* **DONE** when pressing 'Space' plays a sound (event-based).  
* **DONE** when both input methods (polling and event-based) work correctly.