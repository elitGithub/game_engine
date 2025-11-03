# Task: Implement Save/Load System

* **Task:** Create a `SaveManager` class.
* **Objective:** To provide a robust, engine-level system for serializing the complete game state to `localStorage` and deserializing it to restore a game session.

---

### Key Components

* **`engine/core/SaveManager.ts`**: A new class that will contain all logic for saving, loading, and managing save slots.
* **`types/index.ts`**: Modify/use the existing `PlayerSaveData` interface to be the canonical structure for save files. It must also include the `currentSceneId` and any other non-player data from the `GameContext` (like global variables).

### Suggested API

```typescript
class SaveManager {
    constructor(engine: Engine);

    /** Saves the current engine state to a slot */
    async saveGame(slotId: string): Promise<boolean>;

    /** Loads a game state from a slot and restores the engine */
    async loadGame(slotId: string): Promise<boolean>;

    /** Deletes a save slot */
    deleteSave(slotId: string): void;

    /** Returns metadata for all available save slots */
    listSaves(): PlayerSaveData[];
}

```
Here are the four comprehensive tasks for the Core Mechanics, formatted as individual markdown files.

TASK-01-SaveManager.md

Markdown

# Task: Implement Save/Load System

* **Task:** Create a `SaveManager` class.
* **Objective:** To provide a robust, engine-level system for serializing the complete game state to `localStorage` and deserializing it to restore a game session.

---

### Key Components

* **`engine/core/SaveManager.ts`**: A new class that will contain all logic for saving, loading, and managing save slots.
* **`types/index.ts`**: Modify/use the existing `PlayerSaveData` interface to be the canonical structure for save files. It must also include the `currentSceneId` and any other non-player data from the `GameContext` (like global variables).

### Suggested API

```typescript
class SaveManager {
    constructor(engine: Engine);

    /** Saves the current engine state to a slot */
    async saveGame(slotId: string): Promise<boolean>;

    /** Loads a game state from a slot and restores the engine */
    async loadGame(slotId: string): Promise<boolean>;

    /** Deletes a save slot */
    deleteSave(slotId: string): void;

    /** Returns metadata for all available save slots */
    listSaves(): PlayerSaveData[];
}
Engine Integration
Instantiation: The SaveManager should be instantiated in the Engine class constructor and stored as a public property (e.g., this.saveManager = new SaveManager(this)).

Saving Logic: When saveGame is called, it must:

Access the engine.context.

Get serializable data from context.player (stats, inventory, etc.).

Convert context.flags (a Set) and context.variables (a Map) into arrays for JSON serialization.

Get the current scene ID from engine.sceneManager.getCurrentScene().id.

Combine all data into an object matching PlayerSaveData and JSON.stringify it.

Loading Logic: When loadGame is called, it must:

Read and JSON.parse the data from localStorage.

Crucially, it must restore the state directly to the engine.context:

Re-populate context.player with the saved data.

Re-create the Set and Map for context.flags and context.variables.

After the context is restored, it must call engine.stateManager.changeState() to transition to the saved scene ID, ensuring the player resumes exactly where they left off.