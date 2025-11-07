TASK: Increase test coverage to create a safety net for all core systems.  
STATUS: PENDING  
Explanation:

* Create unit tests for all untested systems, plugins, and helpers.  
* This provides a "green" state to validate against after the Nx monorepo refactor.  
* Priority 1: Core Coordinators  
  * \[ \] engine/core/SystemFactory.ts  
  * \[ \] engine/Engine.ts (game loop, state changes)  
  * \[ \] engine/systems/AssetManager.ts  
  * \[ \] engine/systems/SceneManager.ts  
* Priority 2: Plugins  
  * \[ \] engine/plugins/InventoryManagerPlugin.ts  
  * \[ \] engine/plugins/RelationshipPlugin.ts  
  * \[ \] engine/plugins/GameClockPlugin.ts  
* Priority 3: Rendering Pipeline  
  * \[ \] engine/core/RenderManager.ts  
  * \[ \] engine/rendering/DomRenderer.ts  
  * \[ \] engine/rendering/helpers/UIRenderer.ts  
  * \[ \] engine/rendering/helpers/DialogueLayoutHelper.ts  
* Priority 4: Other Systems & Utilities  
  * \[ \] engine/systems/EffectManager.ts  
  * \[ \] engine/systems/ActionRegistry.ts  
  * \[ \] engine/systems/LocalizationManager.ts  
  * \[ \] engine/utils/Dice.ts

TASK: Refactor the project into a proper Nx monorepo structure.  
STATUS: PENDING  
Explanation:

* This is a larger structural change to be done AFTER test coverage is complete.  
* Create a 'packages/' directory.  
* Move the current 'engine/' code into 'packages/engine/src/'.  
* Move 'engine/plugins/' into 'packages/plugins/'.  
* Create a 'packages/example-game/' directory to build a simple game that *uses* the engine, proving the 'plug-and-develop' concept.  
* This will properly leverage the Nx configuration files.