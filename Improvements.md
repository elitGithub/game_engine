# **Engine Enhancement Roadmap**

This document outlines the planned tasks for enhancing the game engine, separating features into Core Mechanics, optional Plugins, and Complex Handling Systems.

## **1\. Core Mechanics (Always-On Engine Features)**

*These are foundational systems that will be built directly into the engine's core. They will always be available, providing essential functionality for any game, even if a specific game chooses not to use a particular feature.*

* \[x\] **Implement Save/Load System**  
  * **Task:** Create a SaveManager class within the engine's core.  
  * **Explanation:** This manager provides methods to serialize the game's state (player data, flags, variables, current scene) into JSON and save it to localStorage (or other StorageAdapter). It will also handle reading this JSON to restore a game's state.  
* \[x\] **Implement Centralized Audio Manager**  
  * **Task:** Create an AudioManager class and integrate it into the main Engine class.  
  * **Explanation:** This system handles loading (via AudioSourceAdapter), playing, looping, and stopping audio. It centralizes all audio control, allowing Actions, Scenes, or UI elements to easily trigger sounds.  
* \[x\] **Refactor for Centralized Input System**  
  * **Task:** Modify the Engine to be the primary listener for keyboard and mouse events.  
  * **Explanation:** The InputManager captures all input and passes it to the GameStateManager, which delegates it to the active GameState. The state is then responsible for determining what the input means.  
* \[x\] **Create a Visual Effects Manager**  
  * **Task:** Build an EffectManager class to apply/remove visual effects to game elements.  
  * **Explanation:** This manager provides an API like engine.effectManager.apply(element, 'xray-effect'). It abstracts the *how* (CSS classes, dynamic updates) from the *what* (applying an effect), allowing a game to easily trigger visual changes.

## **1.5. Core Refactor (Phase 2): Decoupled Rendering Pipeline**

*This is the next major refactor to create a fully decoupled, robust rendering engine. It involves breaking up the current renderers into specialized, single-responsibility systems.*

* \[x\] **Create a Centralized AssetManager**  
  * **Task:** Build a new AssetManager class.  
  * **Explanation:** This will be the *only* system that loads and caches assets (images, JSON, audio, localization strings). All renderers will become "dumb" and request *already-loaded* assets from this manager (e.g., assetManager.getImage('bg\_forest')) instead of loading them directly.  
* \[ \] **Split SpriteRenderer into SceneRenderer and UIRenderer**  
  * **Task:** Refactor the existing SpriteRenderer.  
  * **Explanation:** Create two new, specialized renderers.  
    * **SceneRenderer:** Manages only the layered "game world" (e.g., background, characters, foreground, hotspots).  
    * **UIRenderer:** Manages only the 2D interface elements on a separate top layer (e.g., menus, HUD, buttons).  
* \[ \] **Decouple Text Rendering from Text Animation**  
  * **Task:** Refactor TextRenderer and move animation logic to EffectManager.  
  * **Explanation:** TextRenderer's only job will be to create the styled DOM for dialogue. The TypewriterEffect logic will be moved into the EffectManager as a reusable effect (like TextFadeInEffect). The GameState will be responsible for applying the desired effect *after* rendering the text.  
* \[ \] **Decouple Interaction from Rendering**  
  * **Task:** Remove all onClick handlers from renderers.  
  * **Explanation:** Renderers will only add data- attributes to clickable elements. The InputManager will listen for clicks and fire generic EventBus events (e.g., scene.object.clicked). The active GameState will listen for these events and handle all game logic.  
* \[ \] **Implement Localization (i18n) System**  
  * **Task:** Create a LocalizationManager.  
  * **Explanation:** This system will be responsible for loading and providing text strings based on a selected language. The AssetManager will load the string files, and this manager will provide an API like loc.getString('ui.main\_menu.start').

## **2\. Plugins (Optional, Extendable Game Systems)**

*These are pre-built, optional systems that a game developer can choose to "plug in." The engine will provide a basic, functional version, which the developer can then heavily customize or extend to fit their game's specific needs.*

* \[ \] **Create a Basic Magic/Spell System Plugin**  
  * **Task:** Develop a BaseSpell class (similar to Action) and a SpellRegistry.  
  * **Explanation:** This provides the framework for a magic system. The engine provides the *concept* of a "spell" and a "spellbook" (registry). The game developer then creates their own specific spells (e.g., class Fireball extends BaseSpell) and registers them. Your ActionRegistry is a perfect model for this.  
* \[ \] **Create a Basic Turn-Based Combat Plugin**  
  * **Task:** Implement a new BattleState (extending GameState) and a simple TurnManager.  
  * **Explanation:** This plugin would provide a ready-to-use game state for handling simple turn-based combat. It would manage whose turn it is (player vs. enemy) and use the ActionRegistry to execute attacks, spells, or actions.  
* \[ \] **Create a Basic Quest/Journal System Plugin**  
  * **Task:** Build a QuestManager that can be added to the engine via PluginManager.  
  * **Explanation:** This plugin would provide a simple API to track the state of quests (e.g., questManager.startQuest('main\_quest\_1'), questManager.updateObjective('main\_quest\_1', 'find\_key'), questManager.getQuestState(...)).  
* \[ \] **Create a Basic Stats/Skills Plugin**  
  * **Task:** Build a StatsPlugin that uses ValueTracker.  
  * **Explanation:** A simple plugin to manage character attributes (e.g., Strength, Intellect). This allows for stat-based skill checks in scenes, powered by utilities like Dice.roll().

## **3\. Complex Handling Systems (Optional, Advanced Managers)**

*These are more complex, specialized systems. Like plugins, they are optional, but they represent a significant piece of functionality that can manage a major aspect of a game.*

* \[x\] **Implement a Relationship Manager**  
  * **Task:** Create a RelationshipManager class (as a plugin).  
  * **Explanation:** This system is responsible for tracking numerical relationship values with NPCs (e..g., relManager.adjustValue('npc\_jane', 10)) and uses ValueTracker as its backend.  
* \[x\] **Implement a Game Clock / Time System**  
  * **Task:** Create a GameClockManager (as a plugin).  
  * **Explanation:** This system manages an internal clock. Actions or Scene transitions can advance the clock. This manager emits events via the EventBus (like 'dayNightChange').  
* \[ \] **Implement a Generic Inventory/Item System**  
  * **Task:** Create a basic InventoryManager plugin and Item base interface.  
  * **Explanation:** This manager would handle the *logic* of adding, removing, and checking for items in a collection, separate from any specific Player class. It should use the CollectionTracker utility as its backend.