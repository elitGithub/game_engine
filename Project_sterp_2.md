Document Status: ACTIONABLE  
Author: Senior System Architect  
Date: 2025-11-16  
Version: 1.3.0

## **1.0 Objective**

The "Step 1" Engine Library (@game-engine/core) is architecturally complete. The "Proof of Duality" initiative is designed to validate its core design philosophy: that the unopinionated "bag of parts" is robust and flexible enough to build fundamentally different game genres without resistance or modification.

We will build two minimal, opposing "Step 2" Frameworks as **applications** to prove this. This is a validation task, not a feature-development task.

## **2.0 NX Monorepo Architecture**

This project will leverage the existing NX Monorepo structure. This provides true logical isolation, a single node\_modules folder, and a seamless developer experience.

**Project Structure:**

/package.json         (Root workspace config)  
/nx.json  
/tsconfig.base.json  
/packages/  
  /core/              (Package: @game-engine/core, READ-ONLY)  
/apps/                (New folder for "Step 2" proofs)  
  /project-scribe/  
  /project-velocity/

## **2.1 Initial Setup (Task Zero)**

Before writing any app logic, you must create the application packages.

1. **For project-scribe:**  
   * Create the directory apps/project-scribe.  
   * Create apps/project-scribe/package.json. It **must** include "@game-engine/core": "workspace:^" in its dependencies.  
   * Create apps/project-scribe/project.json (you can copy this from packages/core/project.json and adapt it, changing the name and sourceRoot).  
   * Create apps/project-scribe/tsconfig.json that extends ../../tsconfig.base.json.  
2. **For project-velocity:**  
   * Repeat the process in apps/project-velocity.  
3. **Install Dependencies:**  
   * Run npm install from the *root* directory. This will link the apps/ to the packages/core via the workspaces feature.

## **3.0 Core Principles (Non-Negotiable)**

1. **NO "STEP 1" MODIFICATIONS:** You **MUST NOT** modify any file under the packages/core/ directory.  
2. **TOTAL ISOLATION:** "Project Scribe" and "Project Velocity" must be logically isolated in the apps/ directory.  
3. **MINIMALISM IS THE GOAL:** Do not add any logic, plugins, or features not explicitly listed.  
4. **ASSEMBLY IS THE ARTIFACT:** The primary artifact for each framework is its main.ts file.

## **4.0 Framework A: "Project Scribe" (UI-Driven Framework)**

### **4.1 Objective**

Prove the engine library's capability to power a static, event-driven, UI-based application (e.g., a Visual Novel).

### **4.2 Core Artifacts to Build**

* apps/project-scribe/package.json (Done in 2.1)  
* apps/project-scribe/project.json (Done in 2.1)  
* apps/project-scribe/tsconfig.json (Done in 2.1)  
* apps/project-scribe/index.html (Points to src/main.ts, must contain \<div id="game-container"\>\</div\>)  
* apps/project-scribe/vite.config.ts  
* apps/project-scribe/src/main.ts (The "Assembler")  
* apps/project-scribe/src/NarrativeState.ts (The primary GameState)  
* apps/project-scribe/src/data/game-data.json

### **4.3 "Step 1" Library Components to Use**

* **Platform:** BrowserPlatformAdapter configured for renderType: 'dom'.  
* **Renderer:** DomRenderer.  
* **Assembly:** SystemContainer, createCoreSystemDefinitions, createPlatformSystemDefinitions.  
* **State:** GameStateManager, GameState, TypedGameContext.  
* **Scenes:** SceneManager, Scene.  
* **Rendering Pipeline:** RenderManager, UIRenderer.  
* **Input:** InputManager.  
* **Eventing:** EventBus.  
* **Assets:** AssetManager.

### **4.4 Logic Flow (Mandatory)**

1. **main.ts (Assembly):**  
   1. Define the ScribeGameData interface: interface ScribeGameData { lastScene: string; }.  
   2. Create the BrowserPlatformAdapter (for dom).  
   3. Create the Engine instance, passing the platform and gameState: { lastScene: null } as ScribeGameData.  
   4. Assemble all required systems (Core \+ Platform).  
   5. Initialize systems (await engine.initializeSystems()).  
   6. **CRITICAL:** await engine.assets.loadManifest(...) using the assets array from game-data.json. This MUST complete before starting.  
   7. Register a story factory with SceneManager.  
   8. Get the loaded game-data.json from AssetManager (engine.assets.get('game\_data')) and load scenes into SceneManager.  
   9. Register NarrativeState with GameStateManager, passing the engine.container to its constructor: stateManager.register('main', new NarrativeState(engine.container));  
   10. engine.start('main').  
2. **NarrativeState.ts (Logic):**  
   1. The class definition **must** extend the typed GameState: class NarrativeState extends GameState\<ScribeGameData\> { ... }.  
   2. The constructor **must** accept and store the SystemContainer: constructor(private container: SystemContainer) { ... }.  
   3. **enter():**  
      * Get systems from the container: this.sceneManager \= this.container.get(CORE\_SYSTEMS.SceneManager); and this.renderManager \= this.container.get(PLATFORM\_SYSTEMS.RenderManager);.  
      * Subscribe to EventBus: this.container.get(CORE\_SYSTEMS.EventBus).on('input.hotspot', this.onHotspotClick.bind(this));.  
      * Calls this.sceneManager.goToScene('scene\_1', this.context).  
      * Calls this.renderCurrentScene().  
   4. **renderCurrentScene():**  
      * This method is the core "framework" logic.  
      * It gets the current Scene and choices from this.sceneManager.  
      * It reads the scene.sceneData (from our JSON).  
      * It **hard-codes layout values** to create PositionedDialogue and PositionedChoice objects. (e.g., const dialogueBG \= { x: 50, y: 400, width: 700, height: 150, ... }). We are *not* building a responsive layout system.  
      * It pushes all commands to this.renderManager.  
   5. **onHotspotClick(event):**  
      * Handler for 'input.hotspot'.  
      * Checks event.data.targetScene.  
      * Calls this.sceneManager.goToScene(event.data.targetScene as string, this.context).  
      * Calls this.renderCurrentScene() to display the new scene.  
   6. **update(deltaTime):**  
      * **CRITICAL:** This method **MUST** be empty. The app is 100% event-driven.

### **4.5 Data Schema (game-data.json)**

{  
  "assets": \[  
    { "id": "char1\_portrait", "url": "\[https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1\](https://placehold.co/200x200/ff0000/ffffff?text=CHAR+1)", "type": "image" },  
    { "id": "game\_data", "url": "./data/game-data.json", "type": "json" }  
  \],  
  "scenes": {  
    "scene\_1": {  
      "sceneType": "story",  
      "dialogue": {  
        "speaker": "Character 1",  
        "text": "This is the first scene. Do you want to go to scene 2?",  
        "portrait": "char1\_portrait"  
      },  
      "choices": \[  
        { "text": "Yes, go to Scene 2", "data": { "targetScene": "scene\_2" } }  
      \]  
    },  
    "scene\_2": {  
      "sceneType": "story",  
      "dialogue": {  
        "speaker": "Narrator",  
        "text": "This is the second scene. There is no escape."  
      },  
      "choices": \[  
        { "text": "Go back to Scene 1", "data": { "targetScene": "scene\_1" } }  
      \]  
    }  
  }  
}

### **4.6 Non-Goals (DO NOT IMPLEMENT)**

* You **WILL NOT** use CanvasRenderer.  
* You **WILL NOT** use isActionTriggered() or isKeyDown().  
* You **WILL NOT** implement SaveManager.  
* You **WILL NOT** use TypewriterEffect or EffectManager.

### **4.7 Acceptance Criteria**

* **DONE** when scene\_1 loads.  
* **DONE** when dialogue, portrait, and choice are visible.  
* **DONE** when clicking the choice hotspot triggers the onHotspotClick handler.  
* **DONE** when SceneManager transitions to scene\_2.  
* **DONE** when scene\_2's text and choice are rendered.  
* **DONE** when clicking "Go back to Scene 1" works.

## **5.0 Framework B: "Project Velocity" (Real-Time Framework)**

### **5.1 Objective**

Prove the engine library's capability to power a real-time, 60fps, polled-input application (e.g., a 2D Brawler or Action Game).

### **5.2 Core Artifacts to Build**

* apps/project-velocity/package.json (Done in 2.1)  
* apps/project-velocity/project.json (Done in 2.1)  
* apps/project-velocity/tsconfig.json (Done in 2.1)  
* apps/project-velocity/index.html (must contain a \<canvas id="game-canvas"\> element)  
* apps/project-velocity/vite.config.ts  
* apps/project-velocity/src/main.ts (The "Assembler")  
* apps/project-velocity/src/ActionState.ts (with a full update() loop)  
* apps/project-velocity/src/Player.ts (class with x, y state)  
* apps/project-velocity/src/data/game-data.json (for assets)

### **5.3 "Step 1" Library Components to Use**

* **Platform:** BrowserPlatformAdapter configured for renderType: 'canvas'.  
* **Renderer:** CanvasRenderer.  
* **Assembly:** SystemContainer, createCoreSystemDefinitions, createPlatformSystemDefinitions.  
* **State:** GameStateManager, GameState, TypedGameContext.  
* **Game Loop:** The core Engine.gameLoop (driven by requestAnimationFrame).  
* **Rendering Pipeline:** RenderManager.  
* **Input:** InputManager, InputActionMapper.  
* **Audio:** AudioManager, SfxPool.  
* **Assets:** AssetManager.

### **5.4 Logic Flow (Mandatory)**

1. **main.ts (Assembly):**  
   1. Define the VelocityGameData interface: interface VelocityGameData { player: Player | null; }.  
   2. Create the BrowserPlatformAdapter (for canvas).  
   3. Create the Engine instance, passing the platform and gameState: { player: null } as VelocityGameData.  
   4. Assemble all required systems (Core \+ Platform).  
   5. Initialize systems (await engine.initializeSystems()).  
   6. **CRITICAL:** await engine.assets.loadManifest(...) using game-data.json. This MUST complete before starting.  
   7. Registers input actions via InputManager:  
      * 'move\_left' (Key 'a')  
      * 'move\_right' (Key 'd')  
      * 'action' (Key ' ')  
   8. Register ActionState with GameStateManager, passing the engine.container: stateManager.register('main', new ActionState(engine.container));  
   9. engine.start('main').  
2. **ActionState.ts (Logic):**  
   1. The class definition **must** extend the typed GameState: class ActionState extends GameState\<VelocityGameData\> { ... }.  
   2. The constructor **must** accept and store the SystemContainer.  
   3. **enter():**  
      * Gets systems: this.inputManager \= this.container.get(PLATFORM\_SYSTEMS.InputManager); (and AudioManager, RenderManager).  
      * Creates a new Player() instance and stores it in this.context.game.player.  
      * **Event-Based Input:** Subscribes to EventBus for 'input.action': this.container.get(CORE\_SYSTEMS.EventBus).on('input.action', this.onAction.bind(this));.  
   4. **update(deltaTime):**  
      * **CRITICAL:** This method **MUST** be fully implemented.  
      * **Polling-Based Input:**  
        * Checks if (this.inputManager.isActionTriggered('move\_left')) { this.context.game.player.move(-1, deltaTime); }  
        * Checks if (this.inputManager.isActionTriggered('move\_right')) { this.context.game.player.move(1, deltaTime); }  
      * Calls this.render().  
   5. **onAction(event):**  
      * Handler for 'input.action'.  
      * Checks if (event.action \=== 'action') { ... }.  
      * Calls this.audioManager.playSound('punch\_sfx').  
   6. **render():**  
      * Pushes one type: 'sprite' command to this.renderManager using this.context.game.player.x and this.context.game.player.y.  
3. **Player.ts (Data):**  
   * A simple class: export class Player { x \= 400; y \= 300; speed \= 200; move(dir: number, dt: number) { this.x \+= dir \* this.speed \* dt; } }.  
4. **data/game-data.json (Assets):**  
   {  
     "assets": \[  
       { "id": "player\_sprite", "url": "\[https://placehold.co/50x50/00ff00/000000?text=P\](https://placehold.co/50x50/00ff00/000000?text=P)", "type": "image" },  
       { "id": "punch\_sfx", "url": "\[https://actions.google.com/sounds/v1/cartoon/punch.mp3\](https://actions.google.com/sounds/v1/cartoon/punch.mp3)", "type": "audio" }  
     \]  
   }

### **5.5 Non-Goals (DO NOT IMPLEMENT)**

* You **WILL NOT** use DomRenderer.  
* You **WILL NOT** use 'input.hotspot'.  
* You **WILL NOT** use SceneManager.  
* You **WILLNT** implement physics or collision.

### **5.6 Acceptance Criteria**

* **DONE** when a sprite renders on a \<canvas\>.  
* **DONE** when ActionState.update() is called every frame.  
* **DONE** when holding 'a' / 'd' keys moves the sprite (polling).  
* **DONE** when pressing 'Space' plays a sound (event-based).  
* **DONE** when both input methods (polling and event-based) work correctly.