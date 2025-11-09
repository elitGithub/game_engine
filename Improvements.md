# **Engine Enhancement Roadmap**

This document outlines future enhancements for the game engine. The core engine is now complete with a plug-and-develop architecture. These are optional plugins that can be added without modifying engine code.

## **Future Plugins (Optional, Extendable Game Systems)**

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

## **Notes**

All core mechanics, rendering pipeline refactors, and complex handling systems have been completed. See `SESSION_STATE.md` for current project status.