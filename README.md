# Abstract Game Engine (Svelte + TS + Tailwind)

A fully abstract game engine for building browser-based games. The engine provides structure and systems, while **you** define the game-specific logic.

## Engine Philosophy

**The engine is abstract and knows nothing about your game.**

- ✅ The engine provides: Scene management, state machines, event bus, rendering systems
- ❌ The engine does NOT provide: Player stats, item systems, combat logic, requirement checking

**Your game implements all game-specific logic in your GameState classes.**

---

## Quick Start

### 1. Project Setup

```bash
# Create new Svelte + TypeScript project
npm create vite@latest your-game-name -- --template svelte-ts
cd your-game-name

# Install Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Configuration

**`tailwind.config.js`**
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,svelte}"],
  theme: { extend: {} },
  plugins: [],
}
```

**`src/app.css`**
```css
@import "tailwindcss";

@layer base {
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; }
}
```

**`vite.config.ts`**
```ts
import { defineConfig } from 'vite'
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
```

**`tsconfig.json`** - Add paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@engine/*": ["src/engine/*"],
      "@game/*": ["src/game/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### 3. Install Engine Files

Copy the entire `engine/` folder and `types/index.ts` into your project:

```
src/
├── engine/          # Copy all engine files here
│   ├── core/
│   ├── systems/
│   └── Engine.ts
└── types/
    └── index.ts     # Copy engine types here
```

### 4. Define Your Game Types

Create `src/game/types.ts` with YOUR game-specific types:

```ts
// Example for an RPG game
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
```

### 5. Create Your Player Class

Create `src/game/entities/Player.ts`:

```ts
import type { PlayerStats } from '@game/types';

export class Player {
    public stats: PlayerStats;
    private inventory: Map<string, number>;
    private flags: Set<string>;

    constructor() {
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
}
```

### 6. Implement Requirements & Effects in Your GameState

The engine's Scene class is just a data container. **YOU** check requirements and apply effects:

Create `src/game/states/StoryState.ts`:

```ts
import { GameState } from '@engine/core/GameState';
import type { Engine } from '@engine/Engine';
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
    private checkRequirements(scene: any): boolean {
        const reqs = scene.getRequirements();
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
    private applyEffects(scene: any): void {
        const effects = scene.getEffects();
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
```

### 7. Create Your Game Data

Create `src/game/data/gameData.ts`:

```ts
import type { GameData } from '@types';

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
```

### 8. Initialize Your Game

Create `src/game/main.ts`:

```ts
import { Engine } from '@engine/Engine';
import { Player } from '@game/entities/Player';
import { StoryState } from '@game/states/StoryState';
import { GAME_DATA } from '@game/data/gameData';

export function createGame(): Engine {
    const engine = new Engine({ debug: true });

    // Set up YOUR game's context
    engine.context.player = new Player();

    // Register YOUR game states
    engine.stateManager.register('story', new StoryState(engine));

    // Load YOUR game data
    engine.loadGameData(GAME_DATA);

    return engine;
}

export function startGame(engine: Engine) {
    engine.start('story', { sceneId: 'start' });
}
```

### 9. Create Your UI

Create `src/App.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { createGame, startGame } from '@game/main';
  
  let game;
  let sceneText = '';
  let choices = [];

  onMount(() => {
    game = createGame();
    
    game.eventBus.on('scene.changed', () => {
      const scene = game.sceneManager.getCurrentScene();
      sceneText = scene.getText();
      choices = scene.getChoices(game.context);
    });
    
    startGame(game);
  });
</script>

<main>
  <p>{sceneText}</p>
  {#each choices as choice, i}
    <button on:click={() => game.handleInput(String(i))}>
      {choice.text}
    </button>
  {/each}
</main>
```

### 10. Run Your Game

```bash
npm install
npm run dev
```

---

## Key Principles

1. **The engine provides structure**, your game provides content
2. **Requirements checking** = Your GameState's responsibility
3. **Effect application** = Your GameState's responsibility  
4. **Player class** = Completely yours to define
5. **Scene data** = Just data, the engine doesn't interpret it

## What You Control

- Player stats and abilities
- Item system
- Combat system  
- Requirement logic (what blocks scene access?)
- Effect logic (what happens when entering a scene?)
- Save/load data structure
- UI rendering

## What The Engine Provides

- Scene management and transitions
- State machine for game states
- Event bus for communication
- Text/sprite rendering systems
- Action registry pattern
- Dice utilities

---

## Need Help?

The engine is abstract by design. If you find yourself asking "how do I make the player have health?" - that's YOUR game's responsibility, not the engine's!
