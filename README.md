# **Game Engine Library (TypeScript)**

This repository provides a fully-decoupled, unopinionated, and platform-agnostic **engine library** (a "bag of parts") for building custom game engines and frameworks.

It is designed to be the clean, testable, and reusable foundation (Step 1\) for building highly-opinionated, "batteries-included" game frameworks (Step 2).

## **Core Philosophy: Engine Library vs. Game Framework**

This project's vision is to solve two problems. The current codebase is being refactored to *be* the first, in order to *enable* the second.

### **1\. The Engine Library (This Repository's Goal)**

* **Type:** "Plug-and-Develop" (A Library)  
* **Analogy:** A "bag of parts" or a "tool-kit" (like three.js).  
* **Philosophy:** Unopinionated, minimal, and flexible. It makes *no* assumptions about your game.  
* **What it Provides:** A robust SystemContainer (DI), clean platform-abstraction interfaces (IPlatformAdapter), and a set of loosely-coupled, high-level systems (like AudioManager, InputManager facades).  
* **Developer's Job:** You are the **assembler**. You must explicitly "plug in" every system you need by registering it with the SystemContainer in your game's entry file. This gives you *total control*.

### **2\. The Game Framework (The Future Goal)**

* **Type:** "Batteries-Included" (A Framework)  
* **Analogy:** A "RenPy-killer" or a genre-specific tool (like RPG Maker).  
* **Philosophy:** Opinionated, "plug-and-play," and fast. It *makes* assumptions to accelerate development for a specific genre (e.g., a Visual Novel).  
* **What it Provides:** A pre-assembled engine that hides the underlying complexity. It will pre-register all the necessary systems (EventBus, StateManager, DomRenderer, SaveManager, DialoguePlugin, etc.).  
* **Developer's Job:** You are the **creator**. You just provide data, assets, and story files. You don't "think about the engine."

**This repository's goal is to be the perfect "Step 1" so that "Step 2" can be built cleanly, without the monolithic hell of frameworks like RenPy.**

## **Current State: The "Refactor-of-the-Refactor"**

The current codebase is in the middle of a **critical refactor** to achieve the "Step 1" vision.

The previous v2.0 refactor was a **failure** because it mixed these two steps. It created a "batteries-included" monolith (SystemDefinitions.ts) *inside* the "plug-and-develop" library, which also ignored its own platform abstractions (InputManager calling navigator.getGamepads).

We are now "cleaning house" to create the A-Grade library. See SESSION\_STATE.md and AUDIT\_REPORT.md for the full roadmap.

## **Quick Start (The "Plug-and-Develop" Library Flow)**

This is how you will use the engine library *after* the refactor is complete. Note that the developer is responsible for assembling their engine.

### **1\. main.ts (The Developer's Assembly File)**

// main.ts  
import { Engine } from '@engine/Engine';  
import { SystemContainer } from '@engine/core/SystemContainer';  
import { BrowserPlatformAdapter } from '@engine/platform/BrowserPlatformAdapter';

// Import system "recipes"  
import { CoreServices } from '@engine/core/CoreServices';  
import { PlatformServices } from '@engine/platform/PlatformServices';

// Import your custom game code  
import { MyGame\_MainMenuState } from './game/states/MainMenuState';  
import { MyGame\_Player } from './game/Player';

export async function main() {  
    // 1\. Create the Platform: The \*only\* platform-specific code.  
    const platform \= new BrowserPlatformAdapter({  
        containerElement: document.getElementById('game-container')  
    });

    // 2\. Create the Engine: A minimal host that owns the container.  
    const engine \= new Engine({ platform });

    // 3\. Assemble Your Engine: You, the developer, \*plug in\* every system.  
    //    This is the "plug-and-develop" vision.  
      
    // A) Register platform-agnostic core services  
    engine.container.register( CoreServices.EventBus() );  
    engine.container.register( CoreServices.StateManager() );  
    engine.container.register( CoreServices.PluginManager() );  
    engine.container.register( CoreServices.AssetManager() );  
      
    // B) Register platform-aware services (these recipes use the platform adapter)  
    engine.container.register( PlatformServices.AudioManager() );  
    engine.container.register( PlatformServices.RenderManager({ type: 'dom' }) );  
    engine.container.register( PlatformServices.InputManager() );  
      
    // C) Register optional services \*if you want them\*  
    engine.container.register( PlatformServices.SaveManager() );

    // D) Register your game's custom states  
    const stateManager \= await engine.container.get(SYSTEMS.StateManager);  
    stateManager.register('main\_menu', new MyGame\_MainMenuState());

    // 4\. Start the Engine: This runs the container's \`initializeAll()\`  
    //    and starts the game loop.  
    await engine.start('main\_menu');  
}

main();

### **2\. App.svelte (The UI Layer)**

Your UI framework (Svelte, React, etc.) is *not* the engine. It just provides a DOM element for the BrowserPlatformAdapter to latch onto.

\<\!-- App.svelte \--\>  
\<script lang="ts"\>  
  import { onMount } from 'svelte';  
  import { main } from './main'; // Your assembly file

  let gameContainer: HTMLElement;

  onMount(() \=\> {  
    // Wait for Svelte to create the \<div\>, then pass it to our game.  
    // The engine knows this \<div\> \*only\* as an \`IDomRenderContainer\`.  
    // It has zero knowledge of "Svelte".  
    main(gameContainer);  
  });  
\</script\>

\<\!--   
  This is the "insertion point" you wanted.  
  The engine's DomRenderer will render \*into\* this div.  
  The engine's DomInputAdapter will listen for events \*on\* this div.  
\--\>  
\<main bind:this={gameContainer} id="game-container" class="w-screen h-screen"\>  
  \<\!-- Your Svelte UI (HUDs, menus, etc.) can go here,  
       or you can let the engine's DomRenderer build it all. \--\>  
\</main\>

## **The Future (Step 2: The "Plug-and-Play" Framework)**

*After* the "Step 1" library is finished, we can build "Step 2" to solve your RenPy problem.

This would be a **new class** or **new repository** (e.g., VisualNovelFramework) that *uses* the engine library.

### **Pseudo-code: VisualNovelFramework**

// This class IS the "batteries-included" assembler.  
// It hides the complexity of Step 1\.  
import { Engine, CoreServices, PlatformServices } from '@engine/core';

export class VisualNovelFramework extends Engine {  
    constructor(config: VNFrameworkConfig) {  
        // 1\. It creates the platform for the user  
        super({ platform: new BrowserPlatformAdapter(config.container) });

        // 2\. It \*is\* the opinionated monolith. It pre-registers  
        //    everything a Visual Novel needs.  
        this.container.register( CoreServices.EventBus() );  
        this.container.register( CoreServices.StateManager() );  
        this.container.register( CoreServices.AssetManager() );  
        this.container.register( PlatformServices.AudioManager() );  
        this.container.register( PlatformServices.RenderManager({ type: 'dom' }) );  
        this.container.register( PlatformServices.InputManager() );  
        this.container.register( PlatformServices.SaveManager() );  
          
        // 3\. It registers its \*own\* plugins  
        this.container.register( VNPlugins.DialogueSystem() );  
        this.container.register( VNPlugins.CharacterSpriteManager() );  
    }

    async startWithData(data: RenPyGameData) {  
        // 4\. It provides the "easy insertion point"  
        const sceneManager \= await this.container.get(SYSTEMS.SceneManager);  
        sceneManager.loadScenes(data.scenes);  
          
        await this.start(data.initialScene);  
    }  
}

This clear separation between the **Library** and the **Framework** is the core vision.