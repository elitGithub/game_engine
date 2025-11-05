# **Abstract Game Engine (TypeScript)**

A fully abstract, config-driven game engine for building browser-based games. The engine provides structure and systems, while you define the game-specific logic.

## **Engine Philosophy**

The engine is abstract and knows nothing about your game. It is config-driven and type-safe.

✅ **The engine provides:**

* A config-driven factory (Engine.create) to build an engine with only the systems you need.  
* A type-safe generic GameContext\<TGame\> that provides your GameState classes with full autocomplete for your game's data.  
* A central SystemRegistry (Service Locator) for decoupled access to systems.  
* Core systems: SceneManager, GameStateManager, EventBus, AssetManager, AudioManager, SaveManager, InputManager, EffectManager.

❌ **The engine does NOT provide:**

* Player stats, item systems, combat logic, or requirement checking.  
* Hard-coded UI.

Your game implements all game-specific logic in your GameState classes, which consume the GameContext provided by the engine.

## **Quick Start**

*(Assumes a standard Svelte \+ TS \+ Vite setup. See old README for Svelte/Tailwind setup steps.)*

### **1\. Define Your Game's Core Types**

Create src/game/types.ts. This is where you define the interfaces for your game-specific data.

// src/game/types.ts  
import type { Player } from './entities/Player';  
import type { Inventory } from './systems/Inventory';  
import type { GameClock } from '@engine/plugins/GameClockPlugin'; // Example plugin  
import type { RelationshipPlugin } from '@engine/plugins/RelationshipPlugin'; // Example plugin

/\*\*  
 \* This is the "TGame" generic.  
 \* It defines the shape of \`context.game\` for full type-safety.  
 \*/  
export interface MyGameState {  
    player: Player;  
    inventory: Inventory;  
    // You can also add systems to your game state  
    clock?: GameClock;  
    relationships?: RelationshipPlugin;  
}

### **2\. Create Your Game Entities**

Create your Player, Inventory, or other classes. They **must** implement ISerializable if you want them to be saved by the SaveManager.

// src/game/entities/Player.ts  
import type { ISerializable } from '@engine/types';

export class Player implements ISerializable {  
    public health: number;  
    public maxHealth: number;  
    public flags: Set\<string\>;

    constructor() {  
        this.health \= 100;  
        this.maxHealth \= 100;  
        this.flags \= new Set();  
    }

    // YOUR game-specific methods  
    hasFlag(flag: string): boolean {  
        return this.flags.has(flag);  
    }

    addFlag(flag: string): void {  
        this.flags.add(flag);  
    }

    // \--- ISerializable Implementation \---

    serialize(): any {  
        // Return a JSON-friendly object of this class's data  
        return {  
            health: this.health,  
            maxHealth: this.maxHealth,  
            flags: Array.from(this.flags)  
        };  
    }

    deserialize(data: any): void {  
        // Repopulate this instance with the saved data  
        this.health \= data.health;  
        this.maxHealth \= data.maxHealth;  
        this.flags \= new Set(data.flags);  
    }  
}

### **3\. Implement Your GameState**

Create your GameState classes. This is where all your game logic lives. Note how it's generic (GameState\<MyGameState\>) and uses the injected this.context for all operations.

// src/game/states/StoryState.ts  
import { GameState } from '@engine/core/GameState';  
import type { GameContext, StateData } from '@engine/types';  
import type { MyGameState } from '@game/types';  
import type { Scene } from '@engine/systems/Scene';

// Pass in your game's type to the generic slot  
export class StoryState extends GameState\<MyGameState\> {  
      
    // The context is guaranteed to be typed  
    protected context\!: GameContext\<MyGameState\>;

    enter(data: StateData \= {}): void {  
        super.enter(data);  
        const sceneId \= data.sceneId || 'start';  
        this.goToScene(sceneId);  
    }

    goToScene(sceneId: string): void {  
        // 1\. Get scene data from the engine  
        const scene \= this.context.sceneManager.getScene(sceneId);  
        if (\!scene) return;

        // 2\. YOUR game-specific requirement checking  
        if (\!this.checkRequirements(scene)) {  
            console.log("Requirements not met\!");  
            return;  
        }

        // 3\. Tell the engine to change scenes  
        this.context.sceneManager.goToScene(sceneId, this.context);

        // 4\. YOUR game-specific effect application  
        this.applyEffects(scene);  
    }

    // YOUR implementation of requirement checking  
    private checkRequirements(scene: Scene): boolean {  
        const reqs \= scene.sceneData.requirements || {};  
          
        // Access your typed game state\!  
        const player \= this.context.game.player; 

        if (reqs.hasFlag && \!player.hasFlag(reqs.hasFlag)) {  
            return false;  
        }  
        return true;  
    }

    // YOUR implementation of effect application  
    private applyEffects(scene: Scene): void {  
        const effects \= scene.sceneData.effects || {};  
        const player \= this.context.game.player;

        if (effects.setFlag) {  
            player.addFlag(effects.setFlag);  
        }

        if (effects.playSound) {  
            // Access engine systems from the context  
            this.context.audio.playSound(effects.playSound);  
        }  
    }

    // Example: Handle UI input  
    handleChoiceClick(choiceIndex: number): void {  
        const scene \= this.context.sceneManager.getCurrentScene();  
        const choices \= scene?.getChoices(this.context) || \[\];  
          
        if (choices\[choiceIndex\]?.targetScene) {  
            this.goToScene(choices\[choiceIndex\].targetScene);  
        }  
    }  
}

### **4\. Create Your Game Data**

Create src/game/data/gameData.ts. This is just a simple data file.

// src/game/data/gameData.ts  
import type { GameData } from '@engine/types';

export const GAME\_DATA: GameData \= {  
    scenes: {  
        "start": {  
            text: "You wake up in a dark forest...",  
            choices: \[  
                { text: "Go north", targetScene: "forest\_north" },  
                { text: "Go south (req: 'key')", targetScene: "forest\_south" }  
            \],  
            effects: {  
                setFlag: "game\_started",  
                playSound: "forest\_ambience"  
            }  
        },  
        "forest\_north": {  
            text: "You find a key\!",  
            effects: {  
                setFlag: "key"  
            },  
            choices: \[  
                { text: "Go back", targetScene: "start" }  
            \]  
        },  
        "forest\_south": {  
            text: "You unlocked the gate\!",  
            requirements: {  
                hasFlag: "key"  
            },  
            choices: \[  
                { text: "Go back", targetScene: "start" }  
            \]  
        }  
    }  
};

### **5\. Initialize Your Game**

Create src/game/main.ts. This is the single entry point that constructs your game by configuring and creating the engine.

// src/game/main.ts  
import { Engine, type EngineConfig } from '@engine/Engine';  
import type { MyGameState } from '@game/types';  
import { Player } from '@game/entities/Player';  
import { Inventory } from '@game/systems/Inventory';  
import { StoryState } from '@game/states/StoryState';  
import { GAME\_DATA } from '@game/data/gameData';  
import { GameClockPlugin } from '@engine/plugins/GameClockPlugin'; // Example plugin  
import { RelationshipPlugin } from '@engine/plugins/RelationshipPlugin'; // Example plugin

export async function createGame(container: HTMLElement): Promise\<Engine\<MyGameState\>\> {  
      
    // 1\. Create YOUR game-specific classes  
    const player \= new Player();  
    const inventory \= new Inventory();  
    const clock \= new GameClockPlugin({ unitsPerDay: 24 });  
    const relationships \= new RelationshipPlugin();

    // 2\. Define YOUR game's initial state  
    const initialGameState: MyGameState \= {  
        player,  
        inventory,  
        clock,  
        relationships  
    };

    // 3\. Define the Engine Config  
    const config: EngineConfig\<MyGameState\> \= {  
        debug: true,  
        gameVersion: '1.0.0',  
          
        // This is your typed game state  
        gameState: initialGameState,   
          
        // Tell the factory which systems to build  
        systems: {  
            audio: true,  
            assets: true,  
            save: true,  
            input: true,  
            effects: true  
        },

        // Pass the DOM element for renderers/input  
        containerElement: container   
    };

    // 4\. Create the engine\!  
    const engine \= await Engine.create\<MyGameState\>(config);

    // 5\. Install Plugins  
    // Plugins are installed \*after\* creation  
    engine.pluginManager.register(clock);  
    engine.pluginManager.install('clock', engine);

    engine.pluginManager.register(relationships);  
    engine.pluginManager.install('relationships', engine);

    // 6\. Register all serializable systems for saving  
    // This tells the SaveManager what to serialize.  
    // The key \*must\* match the key in your save file.  
    engine.registerSerializableSystem('player', player);  
    engine.registerSerializableSystem('inventory', inventory);  
    // Plugins register themselves (e.g., 'clock', 'relationships')

    // 7\. Register YOUR game states  
    engine.stateManager.register('story', new StoryState());

    // 8\. Load YOUR game data  
    engine.loadGameData(GAME\_DATA);

    // 9\. (Optional) Preload assets  
    await engine.preload(\[  
        { id: 'forest\_ambience', url: '/audio/forest.mp3', type: 'audio' },  
        { id: 'main\_bg', url: '/img/main\_bg.png', type: 'image' }  
    \]);

    return engine;  
}

export function startGame(engine: Engine\<MyGameState\>) {  
    engine.start('story', { sceneId: 'start' });  
}

### **6\. Create Your UI**

Create src/App.svelte to listen to the engine and render the UI.

\<\!-- src/App.svelte \--\>  
\<script lang="ts"\>  
  import { onMount } from 'svelte';  
  import type { Engine } from '@engine/Engine';  
  import type { MyGameState } from '@game/types';  
  import type { SceneChoice } from '@engine/types';  
  import { createGame, startGame } from '@game/main';  
    
  let engine: Engine\<MyGameState\>;  
  let sceneText: string \= 'Loading...';  
  let choices: SceneChoice\[\] \= \[\];  
  let gameContainer: HTMLElement; // The DOM element for the engine

  onMount(async () \=\> {  
    // Create the engine, passing the container  
    engine \= await createGame(gameContainer);  
      
    // Listen for the engine's scene.changed event  
    engine.eventBus.on('scene.changed', (data) \=\> {  
      const scene \= engine.sceneManager.getScene(data.sceneId);  
      if (scene) {  
        sceneText \= scene.getText();  
        choices \= scene.getChoices(engine.context);  
      }  
    });  
      
    // Start the game  
    startGame(engine);  
  });  
    
  function handleChoiceClick(choiceIndex: number) {  
    // Get the active game state and call its method  
    const storyState \= engine.stateManager.getCurrentState() as any;  
    if (storyState && typeof storyState.handleChoiceClick \=== 'function') {  
      storyState.handleChoiceClick(choiceIndex);  
    }  
  }  
\</script\>

\<\!--   
  This is the main container.  
  The engine will attach input listeners and renderers here.  
\--\>  
\<main bind:this={gameContainer} class="w-screen h-screen bg-gray-900 text-white"\>  
    
  \<\!-- This is just an example UI. Build yours however you want. \--\>  
  \<div class="p-8"\>  
    \<p class="text-lg mb-4"\>{sceneText}\</p\>  
      
    \<div class="flex flex-col items-start space-y-2"\>  
      {\#each choices as choice, i}  
        \<button   
          on:click={() \=\> handleChoiceClick(i)}  
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"  
        \>  
          {choice.text}  
        \</button\>  
      {/each}  
    \</div\>  
  \</div\>

\</main\>

### **7\. Run Your Game**

npm install  
npm run dev  
