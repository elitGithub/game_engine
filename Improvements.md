# Engine Enhancement Roadmap

This document outlines the planned tasks for enhancing the game engine, separating features into Core Mechanics, optional Plugins, and Complex Handling Systems.

---

## 1. Core Mechanics (Always-On Engine Features)
*These are foundational systems that will be built directly into the engine's core. They will always be available, providing essential functionality for any game, even if a specific game chooses not to use a particular feature.*

- [ ] **Implement Save/Load System**
    - **Task:** Create a `SaveManager` class within the engine's core.
    - **Explanation:** This manager will provide methods to serialize the game's state (player data, flags, variables, current scene) into JSON and save it to `localStorage`. It will also handle reading this JSON to restore a game's state. This is a non-negotiable feature for most games. You've already defined a `PlayerSaveData` interface which is the perfect starting point.

- [ ] **Implement Centralized Audio Manager**
    - **Task:** Create an `AudioManager` class and integrate it into the main `Engine` class.
    - **Explanation:** This system will handle loading, playing, looping, and stopping audio (both background music and sound effects). It will centralize all audio control, allowing `Action`s, `Scene`s, or UI elements to easily trigger sounds.

- [ ] **Refactor for Centralized Input System**
    - **Task:** Modify the `Engine` to be the primary listener for keyboard and mouse events.
    - **Explanation:** This is a crucial architectural refactor. Instead of different systems listening for input (like `SpriteRenderer`'s `onClick` or the `Engine`'s `handleInput`), the `Engine` will capture all input and pass it to the `GameStateManager`, which will then delegate it to the active `GameState`. The state is then responsible for determining what the input means.

- [ ] **Create a Visual Effects Manager**
    - **Task:** Build an `EffectManager` class to apply/remove visual effects to game elements.
    - **Explanation:** You've got the CSS files for effects, but the *engine* should manage them. This manager would provide an API like `engine.effectManager.apply(element, 'xray-effect')` or `engine.effectManager.applyToSprite('enemy-sprite', 'glitch')`. This abstracts the *how* (CSS classes) from the *what* (applying an effect), allowing a game to easily trigger visual changes on sprites, text, or the entire screen.

---

## 2. Plugins (Optional, Extendable Game Systems)
*These are pre-built, optional systems that a game developer can choose to "plug in." The engine will provide a basic, functional version, which the developer can then heavily customize or extend to fit their game's specific needs.*

- [ ] **Create a Basic Magic/Spell System Plugin**
    - **Task:** Develop a `BaseSpell` class (similar to `Action`) and a `SpellRegistry`.
    - **Explanation:** This provides the framework for a magic system. The engine provides the *concept* of a "spell" and a "spellbook" (registry). The game developer then creates their own specific spells (e.g., `class Fireball extends BaseSpell`) and registers them. Your `ActionRegistry` is a perfect model for this.

- [ ] **Create a Basic Turn-Based Combat Plugin**
    - **Task:** Implement a new `BattleState` (extending `GameState`) and a simple `TurnManager`.
    - **Explanation:** This plugin would provide a ready-to-use game state for handling simple turn-based combat. It would manage whose turn it is (player vs. enemy) and use the `ActionRegistry` to execute attacks, spells, or actions. The game developer would then provide the enemy data and hook this state up to their scenes.

- [ ] **Create a Basic Quest/Journal System Plugin**
    - **Task:** Build a `QuestManager` that can be added to the engine.
    - **Explanation:** This plugin would provide a simple API to track the state of quests (e.g., `questManager.startQuest('main_quest_1')`, `questManager.updateObjective('main_quest_1', 'find_key')`, `questManager.getQuestState(...)`). The game's `Action`s or `Scene` effects would call these methods.

---

## 3. Complex Handling Systems (Optional, Advanced Managers)
*These are more complex, specialized systems. Like plugins, they are optional, but they represent a significant piece of functionality that can manage a major aspect of a game.*

- [ ] **Implement a Relationship Manager**
    - **Task:** Create a `RelationshipManager` class to be added to the `Engine`.
    - **Explanation:** This system would be responsible for tracking numerical relationship values with NPCs (e.g., `relManager.adjustValue('npc_jane', 10)` or `relManager.getValue('npc_bob')`). This allows choices in scenes or dialogues to have tangible, long-term effects on the game world.

- [ ] **Implement a Game Clock / Time System**
    - **Task:** Create a `GameClockManager` to track in-game time.
    - **Explanation:** This system would manage an internal clock. `Action`s or `Scene` transitions could advance the clock (e.g., `clock.advance(hours=4)`). This manager could then emit events via the `EventBus` (like `'dayNightChange'`) or set a flag (like `context.flags.set('isNight')`) that other systems can react to.

- [ ] **Implement a Generic Inventory/Item System**
    - **Task:** Create a basic `InventoryManager` class and `Item` base interface.
    - **Explanation:** While your *game* will define its specific items, the *engine* can provide the base-level functionality. This manager would handle the *logic* of adding, removing, and checking for items in a collection, separate from any specific `Player` class. This makes the logic reusable for player inventories, shop inventories, or world containers.