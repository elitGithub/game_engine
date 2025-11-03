# New Game Project (Svelte + TS + Tailwind Engine)

This is a new game project built on your Svelte + TypeScript game engine. Follow these steps to get a new project up and running from scratch.

## 1. Project Setup (Vite + Svelte + Tailwind)

First, create a new Svelte + TS project and install Tailwind.

```bash
# 1. Create a new Svelte + TypeScript project with Vite
npm create vite@latest your-new-game-name -- --template svelte-ts

# 2. Enter the new project directory
cd your-new-game-name

# 3. Install Tailwind CSS and its dependencies
npm install -D tailwindcss postcss autoprefixer

# 4. Initialize Tailwind (creates tailwind.config.js and postcss.config.js)
npx tailwindcss init -p
```

---

## 2. Configuration

Next, configure your new project's files to match the engine's requirements for path aliases and styling.

### `tailwind.config.js`

Replace the contents of your new `tailwind.config.js` with this:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,svelte}", // Watch all Svelte/TS files for classes
  ],
  theme: {
    extend: {
      // Add your game-specific theme colors, fonts, etc. here
      colors: {
        'game-bg': '#1a1a1a',
        'game-text': '#e5e7eb',
        'game-accent': '#646cff',
      },
    },
  },
  plugins: [],
}
```

### `src/app.css`

Replace the contents of `src/app.css` with this to include Tailwind's base styles:

```css
@import "tailwindcss";

@layer base {
  :root {
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background-color: #1a1a1a; /* Default game-bg color */
    color: rgba(255, 255, 255, 0.87); /* Default game-text color */
  }

  #app {
    width: 100%;
  }
}
```

### `vite.config.ts`

Update `vite.config.ts` to include the path aliases. This is crucial for clean imports.

```ts
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path' // You will need to import 'path'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [svelte()],
  // Add this 'resolve' block
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, './src/engine'),
      '@game': path.resolve(__dirname, './src/game'),
      '@components': path.resolve(__dirname, './src/components'),
      '@types': path.resolve(__dirname, './src/types')
    }
  }
})
```

### `tsconfig.json`

Update `tsconfig.json` to tell TypeScript about the path aliases.

```json
{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "types": ["svelte", "vite/client"],
    "noEmit": true,
    "allowJs": true,
    "checkJs": true,
    "moduleDetection": "force",

    /* ADD/UPDATE THESE LINES */
    "baseUrl": ".",
    "paths": {
      "@engine/*": ["src/engine/*"],
      "@game/*": ["src/game/*"],
      "@components/*": ["src/components/*"],
      "@types/*": ["src/types/*"]
    }
    /* END OF ADDED/UPDATED LINES */
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 3. Install The Engine

These are the generic, reusable core files. Copy them from your original "Gamebook" project into this new one.

1.  **Create** the folder `src/engine`.
2.  **Copy** the entire `core/`, `systems/`, and `utils/` subfolders into `src/engine`.
3.  **Copy** `Engine.ts` into `src/engine`.
    Your `src/engine` folder should now look like this:
    ```
    src/
    └── engine/
        ├── core/
        │   ├── EventBus.ts
        │   ├── GameState.ts
        │   └── GameStateManager.ts
        ├── systems/
        │   ├── Action.ts
        │   ├── ActionRegistry.ts
        │   ├── Scene.ts
        │   └── SceneManager.ts
        ├── utils/
        │   └── Dice.ts
        └── Engine.ts
    ```
4.  **Create** the folder `src/types`.
5.  **Copy** your `index.ts` file into `src/types`.

---

## 4. Create Your "Game" Stub

These are the *minimal* game-specific files you need to make the project run. You will replace the content of these files with your new game's logic.

1.  **Create** the folders:
    * `src/game/`
    * `src/game/actions/`
    * `src/game/data/`
    * `src/game/entities/`
    * `src/game/states/`
    * `src/game/ui/`
    * `src/components/`

2.  **Create** the following "stub" files with minimal content:

    **`src/types/index.ts`** (Make sure it includes these basics)
    ```ts
    // This file will grow as you define your game
    import type { Engine } from '@engine/Engine';

    export interface GameContext {
        engine: Engine;
        player?: any; // Your future Player class
        flags: Set<string>;
        variables: Map<string, any>;
        [key: string]: any;
    }
    
    export interface StateData { [key: string]: any; }
    export type EventCallback = (data: any) => void;
    export interface SceneChoice { text: string; [key: string]: any; }
    export interface SceneData { text?: string; choices?: SceneChoice[]; [key: string]: any; }
    export interface ScenesDataMap { [sceneId: string]: SceneData; }
    export interface GameData { scenes?: ScenesDataMap; }
    export interface ActionContext extends GameContext { player: any; }
    export interface PlayerStats { [key: string]: any; } // Your future stats interface
    ```

    **`src/game/entities/Player.ts`**
    ```ts
    // A minimal Player class to make the game compile
    export class Player {
        constructor() {
            console.log("New Player created!");
        }
        getStats(): PlayerStats { return { info: "I am a player" }; }
    }
    ```

    **`src/game/data/gameData.ts`**
    ```ts
    import type { GameData } from '@types';

    export const GAME_DATA: GameData = {
        scenes: {
            "start": {
                "text": "This is the start of your new game!",
                "choices": [
                    { "text": "Choice 1" },
                    { "text": "Choice 2" },
                ]
            }
        }
    };
    ```

    **`src/game/states/StoryState.ts`**
    ```ts
    import type { StateData, SceneChoice, ActionContext } from '@types';
    import { GameState } from '@engine/core/GameState';
    import type { Engine } from '@engine/Engine';
    import type { Scene } from '@engine/systems/Scene';

    export class StoryState extends GameState {
        constructor(private engine: Engine) {
            super('story');
        }

        enter(data: StateData = {}): void {
            super.enter(data);
            const sceneId = data.sceneId || 'start';
            this.engine.sceneManager.goToScene(sceneId, this.engine.context);
        }

        handleInput(input: string): void {
            console.log(`Choice handled: ${input}`);
            // Add your choice-handling logic here
        }
        
        getAvailableChoices(scene: Scene, context: ActionContext): SceneChoice[] {
             return scene.getChoices(context);
        }
    }
    ```

    **`src/game/main.ts`**
    ```ts
    import type { StateData } from '@types';
    import { Engine } from '@engine/Engine';
    import { Player } from '@game/entities/Player';
    import { StoryState } from '@game/states/StoryState';
    import { GAME_DATA } from '@game/data/gameData';

    export function createGame(): Engine {
        console.log('Initializing new game...');
        const engine = new Engine({ debug: true });

        // Create and set up context
        engine.context.player = new Player();

        // Register game-specific states
        engine.stateManager.register('story', new StoryState(engine));
        
        // Register game-specific actions
        // engine.actionRegistry.register(new YourAction(), 'battle');
        
        engine.loadGameData(GAME_DATA);
        console.log('Game initialized! Ready to start.');
        return engine;
    }

    export function startGame(engine: Engine, initialState: string = 'story', initialData: StateData = { sceneId: 'start' }) {
        engine.start(initialState, initialData);
    }
    ```

    **`src/game/ui/stores.ts`**
    ```ts
    import { writable } from 'svelte/store';
    
    export const gameStarted = writable(false);
    export const currentSceneText = writable('');
    export const currentChoices = writable<any[]>([]);
    // Add more stores as your game needs them
    ```

    **`src/App.svelte`** (This will be your main game UI)
    ```svelte
    <script lang="ts">
      import { onMount } from 'svelte';
      import type { Engine } from '@engine/Engine';
      import { createGame, startGame } from '@game/main';
      import type { Scene } from '@engine/systems/Scene';
      import { gameStarted, currentSceneText, currentChoices } from '@game/ui/stores';

      let game: Engine;

      function handleStartClick() {
        gameStarted.set(true);
        
        // Register event listeners FIRST
        game.eventBus.on('scene.changed', () => {
          const scene = game.sceneManager.getCurrentScene() as Scene;
          if (scene) {
            currentSceneText.set(scene.getText());
            const storyState = game.stateManager.states.get('story') as any;
            currentChoices.set(storyState.getAvailableChoices(scene, game.context));
          }
        });
        
        // THEN start the game
        startGame(game, 'story', { sceneId: 'start' });
      }

      onMount(() => {
        game = createGame();
      });
    </script>

    <main class="game-container min-h-screen py-20 max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8 text-game-accent">
        Your New Game Title
      </h1>

      {#if !$gameStarted}
        <div class="text-center">
          <button
            class="px-6 py-3 bg-game-accent text-white rounded-lg font-medium"
            on:click={handleStartClick}
          >
            Start Game
          </button>
        </div>
      {:else}
        <div class="p-8 bg-black/20 rounded-xl border border-white/10">
          <p class="text-lg text-gray-300 leading-relaxed whitespace-pre-wrap mb-8">
            {$currentSceneText}
          </p>

          <div class="flex flex-col gap-4">
            {#each $currentChoices as choice, i}
              <button
                class="p-4 bg-gray-700 hover:bg-gray-600 text-white text-left rounded-lg"
                on:click={() => game.handleInput(String(i))}
              >
                <span class="font-bold">{i + 1}.</span> {choice.text}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </main>
    ```

---

## 5. Run Your Blank Game

Your project now has the engine, all configurations, and a minimal "stub" game.

```bash
# 1. Install all npm packages (Svelte, Vite, etc.)
npm install

# 2. Run the development server
npm run dev
```

You should now see your "blank" game running in the browser. It will load, show your title, and display the single scene from `gameData.ts`.

---

## 6. Next Steps

Your engine is running! Now, you just have to build your game on top of it:

1.  **Flesh out `src/game/entities/Player.ts`**: Add your new game's stats (e.g., `energy`, `credits`, `hackingSkill`).
2.  **Define `src/types/index.ts`**: Add your new interfaces (e.g., `PlayerStats`, `ShipData`).
3.  **Populate `src/game/data/gameData.ts`**: Write your story! Add all your scenes, text, and choices.
4.  **Create Actions**: Build your game's unique actions (e.g., `HackAction.ts`, `TradeAction.ts`) in `src/game/actions/` and register them in `src/game/main.ts`.
5.  **Build Components**: Create your Svelte components (e.g., `PlayerStats.svelte`, `ShipComputer.svelte`) in `src/components/` and wire them up in `App.svelte`.