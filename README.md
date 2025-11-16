# **Game Engine Library (TypeScript)**

This repository provides a fully-decoupled, unopinionated, and platform-agnostic **engine library** (a "bag of parts") for building custom game engines and frameworks.

It is designed to be the clean, testable, and reusable foundation (**Step 1**) for building highly-opinionated, "batteries-included" game frameworks (**Step 2**).

## **Core Philosophy: Engine Library vs. Game Framework**

This project's vision is to solve two problems. This codebase is **Step 1** and *only* Step 1\.

### **1\. The Engine Library (This Repository)**

* **Type:** "Plug-and-Develop" (A **Library**)  
* **Analogy:** A "bag of parts" or a "tool-kit."  
* **Philosophy:** Unopinionated, minimal, and flexible. It makes *no* assumptions about your game.  
* **What it Provides:** A robust SystemContainer (DI), clean platform-abstraction interfaces (IPlatformAdapter), and a set of loosely-coupled, high-level systems (like AudioManager, InputManager facades).  
* **Developer's Job:** You are the **assembler**. You must explicitly "plug in" *every* system you need by registering it with the SystemContainer in your game's entry file. This gives you **total control**.

### **2\. The Game Framework (The Future Goal)**

* **Type:** "Batteries-Included" (A **Framework**)  
* **Analogy:** A genre-specific tool (like RPG Maker).  
* **Philosophy:** Opinionated, "plug-and-play," and fast. It *makes* assumptions to accelerate development for a specific genre (e.g., a Visual Novel).  
* **What it Provides:** A pre-assembled engine that hides the underlying complexity. It will pre-register all the necessary systems.  
* **Developer's Job:** You are the **creator**. You just provide data, assets, and story files. You don't "think about the engine."

This repository's goal is to be the perfect "Step 1" so that "Step 2" can be built cleanly.

## **Core Features**

* **Platform-Agnostic:** A strict abstraction layer (IPlatformAdapter) isolates all platform-specific code (DOM, Web Audio, fetch, setTimeout, etc.).  
* **Dependency Injection:** A lightweight SystemContainer manages system lifecycles, dependencies, and initialization order.  
* **Unopinionated Core:** The Engine class is a minimal host that owns the container and the game loop. You build *your* engine, you don't adapt to *ours*.  
* **Event-Driven:** A core EventBus allows for loosely-coupled communication between systems.  
* **Testable:** The architecture (facades, DI, platform abstraction) is designed for comprehensive unit and integration testing.

## **Quick Start (The "Plug-and-Develop" Flow)**

This example shows the "Assembler" pattern. You are responsible for creating the platform, the engine, and registering every system you intend to use.

### **1\. main.ts (Your Game's Entry Point)**

This is the "Assembler" file. You "plug in" the parts you need.

import { Engine, type EngineConfig } from '@game-engine/core/Engine';  
import { BrowserPlatformAdapter, type BrowserPlatformConfig } from '@game-engine/core/platform/BrowserPlatformAdapter';  
import { GameState } from '@game-engine/core/core/GameState';  
import { GameStateManager } from '@game-engine/core/core/GameStateManager';  
import { SystemContainer } from '@game-engine/core/core/SystemContainer';  
import { createCoreSystemDefinitions, CORE\_SYSTEMS } from '@game-engine/core/core/CoreSystemDefs';  
import { createPlatformSystemDefinitions, PLATFORM\_SYSTEMS, type PlatformSystemConfig } from '@game-engine/core/core/PlatformSystemDefs';  
import type { TypedGameContext } from '@game-engine/core/types';

// \--- Your Game's Specific Types \---

// 1\. Define your game's state (this is your data)  
interface MyGameData {  
    playerName: string;  
    score: number;  
}

// 2\. Define your game state class  
class MainMenuState extends GameState\<MyGameData\> {  
    constructor(private container: SystemContainer) {  
        super('main\_menu');  
    }

    enter(): void {  
        console.log('Main Menu Entered\!');  
        // You can now safely get systems YOU registered  
        // const input \= this.container.get\<InputManager\>(PLATFORM\_SYSTEMS.InputManager);  
    }  
      
    update(deltaTime: number): void {  
        // Access your typed game data  
        this.context.game.score \+= 1;  
    }  
}

// 3\. Define your game's initial state  
const myInitialGameState: MyGameData \= {  
    playerName: 'Hero',  
    score: 0,  
};

// \--- The Assembly Function \---

export async function main() {  
    // 1\. Create the Platform: The \*only\* platform-specific code.  
    const platform \= new BrowserPlatformAdapter({  
        containerElement: document.getElementById('game-container')\!,  
        renderType: 'dom', // Use the DOM renderer  
        audio: true,  
        input: true,  
    });

    // 2\. Create the Engine: The minimal host.  
    const engineConfig: EngineConfig \= {  
        platform,  
        gameState: myInitialGameState,  
        gameVersion: '1.0.0',  
        systems: {}, // Note: This is legacy. Definitions are preferred.  
    };  
    const engine \= new Engine(engineConfig);

    // 3\. Assemble Your Engine: You, the developer, \*plug in\* every system.  
      
    // A) Get system "recipes" (definitions)  
    const coreDefinitions \= createCoreSystemDefinitions();  
      
    const platformConfig: PlatformSystemConfig \= {  
        assets: true,  
        audio: true,  
        effects: true,  
        renderer: { type: 'dom' },  
        input: true,  
    };  
    const platformDefinitions \= createPlatformSystemDefinitions(platform, platformConfig);

    // B) Register all definitions with the container  
    for (const def of \[...coreDefinitions, ...platformDefinitions\]) {  
        engine.container.register(def);  
    }

    // 4\. Initialize Systems: The container creates instances and resolves dependencies  
    await engine.initializeSystems();

    // 5\. Register Your Game States  
    // Get the StateManager you registered  
    const stateManager \= engine.container.get\<GameStateManager\>(CORE\_SYSTEMS.StateManager);  
      
    // Inject the container so your state can access other systems  
    stateManager.register('main\_menu', new MainMenuState(engine.container));

    // 6\. Start the Engine  
    // This will call stateManager.changeState() and start the game loop  
    engine.start('main\_menu');  
}

// Run the main function  
main();

### **2\. index.html (The Platform Host)**

The engine only needs a single DOM element to attach to.

\<\!DOCTYPE html\>  
\<html lang="en"\>  
\<head\>  
    \<meta charset="UTF-8"\>  
    \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    \<title\>My Game\</title\>  
    \<style\>  
        body { margin: 0; background: \#000; }  
        \#game-container {  
            width: 100vw;  
            height: 100vh;  
            overflow: hidden;  
        }  
    \</style\>  
\</head\>  
\<body\>  
    \<\!--   
      This is the "insertion point".  
      The BrowserPlatformAdapter will receive this element.  
      \- DomRenderer will render \*into\* this div.  
      \- DomInputAdapter will listen for events \*on\* this div.  
    \--\>  
    \<div id="game-container"\>\</div\>  
      
    \<\!-- Load your bundled game script \--\>  
    \<script type="module" src="/main.ts"\>\</script\>  
\</body\>  
\</html\>

## **Available Systems**

When you call createCoreSystemDefinitions and createPlatformSystemDefinitions, these are the systems you can register and retrieve from the container.

### **Core Systems (Platform-Agnostic)**

* CORE\_SYSTEMS.EventBus: Facilitates event-driven communication.  
* CORE\_SYSTEMS.StateManager: Manages the game state stack (GameState).  
* CORE\_SYSTEMS.SceneManager: Handles scene loading and transitions.  
* CORE\_SYSTEMS.ActionRegistry: Manages and executes game-specific actions.  
* CORE\_SYSTEMS.PluginManager: Manages the lifecycle of plugins.

### **Platform Systems (Platform-Agnostic Facades)**

These require an IPlatformAdapter to function.

* PLATFORM\_SYSTEMS.AssetManager: Manages loading and caching assets (images, audio, JSON).  
* PLATFORM\_SYSTEMS.AudioManager: A facade for playing music, SFX, and voice.  
* PLATFORM\_SYSTEMS.EffectManager: Manages visual effects for DOM or Canvas targets.  
* PLATFORM\_SYSTEMS.RenderManager: A facade that manages render queues and flushes them to a "dumb" renderer (like DomRenderer or CanvasRenderer).  
* PLATFORM\_SYSTEMS.InputManager: A facade that processes input events, manages action mappings, and detects combos.

### **Optional Systems**

You can also register optional systems, like the SaveManager, or your own custom plugins.

// Example: Adding the SaveManager  
import { SaveManager } from '@game-engine/core/systems/SaveManager';  
import { MigrationManager } from '@game-engine/core/systems/MigrationManager';

// ... in your assembly function ...  
engine.container.register({  
    key: 'SaveManager', // Use a string or Symbol  
    dependencies: \[CORE\_SYSTEMS.EventBus\],  
    factory: (c) \=\> {  
        const eventBus \= c.get(CORE\_SYSTEMS.EventBus);  
        const storageAdapter \= platform.getStorageAdapter(); // Get from platform  
        const migrationManager \= new MigrationManager(engine.migrationFunctions);  
          
        // Pass the engine (as ISerializationRegistry) and the adapter  
        return new SaveManager(eventBus, engine, storageAdapter, migrationManager);  
    }  
});  
