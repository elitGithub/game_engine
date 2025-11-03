Svelte Gamebook EngineThis is a decoupled, event-driven game engine designed for creating text-based, choice-driven games (like visual novels or "battle-books") in a Svelte + TypeScript environment.The core principle is a 3-layer architecture:Engine Layer (src/engine): Generic, reusable code that knows how to run a game (manage states, scenes, events).Game Layer (src/game): Game-specific code that knows what your game is (rules, story, data, entities).UI Layer (src/components, App.svelte): Svelte components that know how to show the game.This guide explains how to use this engine to build a new game from scratch.How to Create a New GameFollow these steps to build a new game on top of the engine.Step 1: Create the Base Project (Svelte + TS + Tailwind)First, set up a new Vite project with Svelte, TypeScript, and Tailwind CSS.Create the Svelte + TS project:npm create vite@latest my-new-game -- --template svelte-ts
cd my-new-game
npm install
Install Tailwind CSS:npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
Configure tailwind.config.js:Open the newly created tailwind.config.js and tell it which files to scan for classes./** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,svelte}", // Scan all Svelte, TS, and JS files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
Configure postcss.config.js:This file was also created. It should look like this:export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
Add Tailwind to your CSS:Create a main CSS file at src/app.css and add the Tailwind directives./* src/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
Import the CSS:Open src/main.ts and import your new CSS file at the top.// src/main.ts
import './app.css' // <-- Add this line
import { mount } from 'svelte'
import App from './App.svelte'

// ... rest of the file
Configure TS Paths (Crucial!):Open your tsconfig.json to set up the path aliases. This lets you import @engine and @game cleanly.{
  "extends": "@tsconfig/svelte/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    // ... other options

    /* ADD THESE LINES */
    "baseUrl": ".",
    "paths": {
      "@engine/*": ["src/engine/*"],
      "@game/*": ["src/game/*"],
      "@components/*": ["src/components/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.svelte"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
Step 2: Copy the Engine FilesFrom your original "Gamebook" project, copy these two folders into your new my-new-game/src/ directory:src/engine/: This is the entire reusable engine.src/types/: This is the "contract" that defines all the shared interfaces.Your new project structure should look like this:my-new-game/
├── src/
│   ├── engine/       <-- COPIED
│   │   ├── core/
│   │   ├── rendering/
│   │   ├── systems/
│   │   └── utils/
│   ├── types/        <-- COPIED
│   │   └── index.ts
│   ├── app.css
│   ├── App.svelte
│   └── main.ts
├── package.json
└── tailwind.config.js
Step 3: Define Your New Game (The "Game" Layer)This is where you build your unique game.Create a new folder: src/game/Inside src/game/, create your game-specific files. You can use the "Gamebook" project as a template, but the logic inside is up to you.src/game/entities/Player.ts:Create your Player class. It can have any stats you want (e.g., mana, sanity, hacking).It must implement a getStats() method that returns an object matching the PlayerStats interface in src/types/index.ts (even if you just return stubs).src/game/entities/ItemDatabase.ts / EnemyDatabase.ts:Create these if your game has items or enemies. They should load and register your game's entities.src/game/states/StoryState.ts / BattleState.ts:Create your game states (e.g., StoryState, HackingMinigameState). They must extend the GameState class from @engine/core/GameState.src/game/actions/AttackAction.ts:Create your custom actions (e.g., HackAction, ScanAction). They must extend the Action class from @engine/systems/Action.src/game/data/gameData.ts:This is your story file. Create a GAME_DATA object that defines all your scenes, text, and choices.src/game/main.ts (The "Factory"):This is the most important file. It assembles your engine and your game.Create src/game/main.ts and add a createGame and startGame function.// src/game/main.ts (TEMPLATE)
import { Engine } from '@engine/Engine';
import { Player } from '@game/entities/Player';
import { ItemDatabase } from '@game/entities/ItemDatabase';
// Import your new states and actions
import { StoryState } from '@game/states/StoryState';
import { HackAction } from '@game/actions/HackAction';
// Import your game data
import { GAME_DATA } from '@game/data/gameData';

export function createGame(): Engine {
    const engine = new Engine({ debug: true });

    // 1. Create player and databases
    const player = new Player();
    const itemDatabase = new ItemDatabase();

    // 2. Set up shared game context
    engine.context.player = player;
    engine.context.itemDatabase = itemDatabase;

    // 3. Register your game's states
    engine.stateManager.register('story', new StoryState(engine));
    // e.g., engine.stateManager.register('hacking', new HackingState(engine));

    // 4. Register your game's actions
    engine.actionRegistry.register(new HackAction(), 'story');

    // 5. Load all scene data
    engine.loadGameData(GAME_DATA);

    // 6. Give player starting items, etc.
    player.addItem('datapad', 1);

    return engine;
}

export function startGame(engine: Engine, initialState: string = 'story', initialData: any = { sceneId: 'start' }) {
    engine.start(initialState, initialData);
}
Step 4: Wire Up the UI (The "UI" Layer)Now, make Svelte display your game.Create UI State: Create src/game/ui/stores.ts. This file holds the Svelte stores that your components will read from.// src/game/ui/stores.ts (TEMPLATE)
import { writable } from 'svelte/store';

export const gameStarted = writable(false);
export const isInBattle = writable(false); // or e.g., isInHackingMinigame
export const playerStats = writable<any>(null);
export const currentSceneText = writable('');
export const currentChoices = writable<any[]>([]);
export const gameLogMessages = writable<string[]>([]);
// ... add any other stores your UI needs
Create Components: Create your UI components in src/components/ (e.g., PlayerHUD.svelte, SceneDisplay.svelte, ChoiceList.svelte). These components should just import and read from your stores.Configure App.svelte (The "Controller"):Modify src/App.svelte to be the main controller that listens to engine events and updates your Svelte stores.<!-- src/App.svelte (TEMPLATE) -->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { Engine } from '@engine/Engine';
  import { createGame, startGame } from '@game/main'; // <-- Import from *your* game
  import type { Scene } from '@engine/systems/Scene';

  // Import your stores
  import {
    gameStarted,
    playerStats,
    currentSceneText,
    currentChoices
    // ... etc
  } from '@game/ui/stores';

  // Import your components
  import PlayerHUD from '@components/PlayerHUD.svelte';
  import SceneDisplay from '@components/SceneDisplay.svelte';

  let game: Engine;

  function updatePlayerStats() {
    if (game && game.context.player) {
      playerStats.set(game.context.player.getStats());
    }
  }

  function handleStartClick() {
    gameStarted.set(true);

    // --- REGISTER EVENT LISTENERS ---
    game.eventBus.on('scene.changed', () => {
      const scene = game.sceneManager.getCurrentScene() as Scene;
      currentSceneText.set(scene.getText());

      // Get available choices from your story state
      const storyState = game.stateManager.states.get('story') as any;
      const choices = storyState.getAvailableChoices(scene, game.context);
      currentChoices.set(choices);
    });

    game.eventBus.on('player.damaged', () => updatePlayerStats());
    game.eventBus.on('player.healed', () => updatePlayerStats());

    // ... register all other event listeners ...

    // --- START GAME (AFTER listeners are registered) ---
    startGame(game, 'story', { sceneId: 'start' });

    // Set initial state
    updatePlayerStats();
  }

  onMount(() => {
    game = createGame();
  });
</script>

<main class="game-container min-h-screen bg-gray-900 text-gray-200 p-8">
  <h1 class="text-4xl font-bold text-center mb-8">My New Sci-Fi Game</h1>

  {#if !$gameStarted}
    <div class="text-center">
      <button
        class="px-6 py-3 bg-blue-600 text-white rounded-lg"
        on:click={handleStartClick}
      >
        Start Game
      </button>
    </div>
  {:else}
    <!-- Render your UI Components -->
    <PlayerHUD />

    <div class="max-w-3xl mx-auto mt-8">
      <SceneDisplay />
      <!-- Your choice component, etc. -->
    </div>
  {/if}
</main>
Step 5: Run Your New Game!You're all set. Run the dev server.npm run dev
Your new game should load. When you click "Start Game", the handleStartClick function will wire up the events, start the engine, and the engine will fire the first scene.changed event. Your UI will catch it and render your first scene from src/game/data/gameData.ts.# game_engine
