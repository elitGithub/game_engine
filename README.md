Abstract Game Engine (Svelte + TS + Tailwind)A fully abstract game engine for building browser-based games. The engine provides structure and systems, while you define the game-specific logic.Engine PhilosophyThe engine is abstract and knows nothing about your game.✅ The engine provides: Scene management, state machines, event bus, rendering systems❌ The engine does NOT provide: Player stats, item systems, combat logic, requirement checkingYour game implements all game-specific logic in your GameState classes.Quick Start1. Project Setup# Create new Svelte + TypeScript project
npm create vite@latest your-game-name -- --template svelte-ts
cd your-game-name

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
2. Configurationtailwind.config.jsexport default {
  content: ["./index.html", "./src/**/*.{js,ts,svelte}"],
  theme: { extend: {} },
  plugins: [],
}
src/app.css@import "tailwindcss";

@layer base {
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; }
}
vite.config.tsimport { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, './src/engine'),
      '@game': path.resolve(__dirname, './src/game'),
      '@types': path.resolve(__dirname, './src/types')
    }
  }
})
tsconfig.json - Add paths:{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@engine/*": ["src/engine/*"],
      "@game/*": ["src/game/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
3. Install Engine FilesCopy the entire engine/ folder and types/index.ts into your project:src/
├── engine/          # Copy all engine files here
│   ├── core/
│   ├── systems/
│   └── Engine.ts
└── types/
    └── index.ts     # Copy engine types here
4. Define Your Game TypesCreate src/game/types.ts with YOUR game-specific types:// Example for an RPG game
export interface PlayerStats {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
}

export interface ItemData {
    id: string;
    name: string;
    description: string;
}

// etc...
5. Create Your Player ClassCreate src/game/entities/Player.ts. Note how it implements ISerializable to hook into the engine's save system.import type { PlayerStats } from '@game/types';
import type { ISerializable, GameContext } from '@types';

export class Player implements ISerializable {
    private context: GameContext;
    public stats: PlayerStats;
    private inventory: Map<string, number>;
    private flags: Set<string>;

    constructor(context: GameContext) {
        this.context = context;
        this.stats = {
            health: 100,
            maxHealth: 100,
            mana: 50,
            maxMana: 50
        };
        this.inventory = new Map();
        this.flags = new Set();
    }

    // YOUR game-specific methods
    hasItem(itemId: string): boolean {
        return this.inventory.has(itemId);
    }

    hasFlag(flag: string): boolean {
        return this.flags.has(flag);
    }

    addFlag(flag: string): void {
        this.flags.add(flag);
    }

    heal(amount: number): void {
        this.stats.health = Math.min(
            this.stats.health + amount,
            this.stats.maxHealth
        );
    }

    takeDamage(amount: number): void {
        this.stats.health = Math.max(0, this.stats.health - amount);
    }
    
    // --- ISerializable Implementation ---

    serialize(): any {
        // Return a JSON-friendly object of this class's data
        return {
            stats: this.stats,
            inventory: Array.from(this.inventory.entries()),
            flags: Array.from(this.flags)
        };
    }

    deserialize(data: any): void {
        // Repopulate this instance with the saved data
        this.stats = data.stats;
        this.inventory = new Map(data.inventory);
        this.flags = new Set(data.flags);
        
        // ** IMPORTANT **
        // The Player is responsible for restoring itself
        // to the global context on load.
        this.context.player = this;
    }
}
6. Implement Requirements & Effects in Your GameStateThe engine's Scene class is just a data container. YOU check requirements and apply effects in your GameState.Create src/game/states/StoryState.ts:import { GameState } from '@engine/core/GameState';
import type { Engine } from '@engine/Engine';
import type { Scene } from '@engine/systems/Scene';
import type { StateData } from '@types';

export class StoryState extends GameState {
    constructor(private engine: Engine) {
        super('story');
    }

    enter(data: StateData = {}): void {
        super.enter(data);
        const sceneId = data.sceneId || 'start';
        this.goToScene(sceneId);
    }

    goToScene(sceneId: string): void {
        const scene = this.engine.sceneManager.getScene(sceneId);
        if (!scene) return;

        // YOUR game-specific requirement checking
        if (!this.checkRequirements(scene)) {
            console.log("Requirements not met!");
            return;
        }

        // Go to the scene
        this.engine.sceneManager.goToScene(sceneId, this.engine.context);

        // YOUR game-specific effect application
        this.applyEffects(scene);
    }

    // YOUR implementation of requirement checking
    private checkRequirements(scene: Scene): boolean {
        // Access data directly from the scene's public property
        const reqs = scene.requirements;
        const player = this.engine.context.player;

        if (reqs.hasItem && !player.hasItem(reqs.hasItem)) {
            return false;
        }

        if (reqs.hasFlag && !player.hasFlag(reqs.hasFlag)) {
            return false;
        }

        return true;
    }

    // YOUR implementation of effect application
    private applyEffects(scene: Scene): void {
        // Access data directly from the scene's public property
        const effects = scene.effects;
        const player = this.engine.context.player;

        if (effects.setFlag) {
            player.addFlag(effects.setFlag);
        }

        if (effects.heal) {
            player.heal(effects.heal);
        }

        if (effects.damage) {
            player.takeDamage(effects.damage);
        }
    }

    handleInput(input: string): void {
        // YOUR choice handling logic
        const scene = this.engine.sceneManager.getCurrentScene();
        const choices = scene?.getChoices(this.engine.context) || [];
        const choiceIndex = parseInt(input);
        
        if (choices[choiceIndex]?.targetScene) {
            this.goToScene(choices[choiceIndex].targetScene);
        }
    }
}
7. Create Your Game DataCreate src/game/data/gameData.ts:import type { GameData } from '@types';

export const GAME_DATA: GameData = {
    scenes: {
        "start": {
            text: "You wake up in a dark forest...",
            choices: [
                { text: "Go north", targetScene: "forest_north" },
                { text: "Go south", targetScene: "forest_south" }
            ],
            effects: {
                setFlag: "game_started"
            }
        },
        "forest_north": {
            text: "You find a healing potion!",
            requirements: {
                hasFlag: "game_started"
            },
            effects: {
                heal: 20
            },
            choices: [
                { text: "Continue", targetScene: "start" }
            ]
        }
    }
};
8. Initialize Your GameCreate src/game/main.ts:import { Engine } from '@engine/Engine';
import { Player } from '@game/entities/Player';
import { StoryState } from '@game/states/StoryState';
import { GAME_DATA } from '@game/data/gameData';

export function createGame(): Engine {
    const engine = new Engine({ debug: true });

    // 1. Create YOUR systems, passing context
    const player = new Player(engine.context);
    // const inventory = new InventoryManager();
    // const clock = new GameClockManager(engine.eventBus);

    // 2. Set up YOUR game's context
    engine.context.player = player;
    // engine.context.inventory = inventory;
    // engine.context.clock = clock;

    // 3. Register all serializable systems for saving
    // This tells the SaveManager to serialize these objects.
    engine.registerSerializableSystem('player', player);
    // engine.registerSerializableSystem('inventory', inventory);
    // engine.registerSerializableSystem('clock', clock);

    // 4. Register YOUR game states
    engine.stateManager.register('story', new StoryState(engine));

    // 5. Load YOUR game data
    engine.loadGameData(GAME_DATA);

    return engine;
}

export function startGame(engine: Engine) {
    engine.start('story', { sceneId: 'start' });
}
9. Create Your UICreate src/App.svelte:<script lang="ts">
  import { onMount } from 'svelte';
  import { createGame, startGame } from '@game/main';
  
  let game;
  let sceneText = '';
  let choices = [];

  onMount(() => {
    game = createGame();
    
    // Listen for the engine's scene.changed event
    game.eventBus.on('scene.changed', () => {
      const scene = game.sceneManager.getCurrentScene();
      sceneText = scene.getText();
      choices = scene.getChoices(game.context);
    });
    
    startGame(game);
  });
  
  function handleChoiceClick(choiceIndex) {
    // Pass a simple string to the game
    // The StoryState will handle the logic
    game.stateManager.getCurrentState()?.handleInput(String(choiceIndex));
  }
</script>

<main>
  <p>{sceneText}</p>
  {#each choices as choice, i}
    <button on:click={() => handleChoiceClick(i)}>
      {choice.text}
    </button>
  {/each
</main>
10. Run Your Gamenpm install
npm run dev
Key PrinciplesThe engine provides structure, your game provides contentRequirements checking = Your GameState's responsibilityEffect application = Your GameState's responsibilityPlayer class = Completely yours to defineScene data = Just data, the engine doesn't interpret itWhat You ControlPlayer stats and abilitiesItem systemCombat systemRequirement logic (what blocks scene access?)Effect logic (what happens when entering a scene?)Save/load data structure (via ISerializable)UI renderingWhat The Engine ProvidesScene management and transitionsState machine for game statesEvent bus for communicationAbstract Save/Load systemText/sprite rendering systemsInput and Audio managersAction registry patternDice utilitiesNeed Help?The engine is abstract by design. If you find yourself asking "how do I make the player have health?" - that's YOUR game's responsibility, not the engine's!