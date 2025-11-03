# Task: Implement a Relationship Manager

* **Task:** Create a `RelationshipManager` class.
* **Objective:** To create an optional, engine-level system for tracking, modifying, and querying numerical relationship values with NPCs or factions.

---

### Key Components

* **`engine/systems/RelationshipManager.ts`**: A new class to store and manage relationship data.
* **`types/index.ts`**: (Optional) Add `context.relationships` to the `GameContext` interface.

### Suggested API

```typescript
class RelationshipManager {
    // Stores relationship values by ID (e.g., 'npc_jane')
    private relationships: Map<string, number>;

    constructor();

    /** Adjusts an NPC's relationship value by a specific amount */
    adjustValue(npcId: string, amount: number): number;

    /** Sets an NPC's relationship value to a specific number */
    setValue(npcId: string, value: number): void;

    /** Retrieves the current relationship value for an NPC */
    getValue(npcId: string): number;

    /** Checks if a value is above or below a threshold */
    checkValue(npcId: string, comparison: '>=', value: number): boolean;
    checkValue(npcId: string, comparison: '<=', value: number): boolean;

    /** (Advanced) Registers named "ranks" for values (e.g., 100 = 'Allied') */
    registerRank(rankName: string, threshold: number): void;
    
    /** (Advanced) Gets the current rank for an NPC */
    getRank(npcId: string): string;

    /** Returns all data for serialization (e.g., for saving) */
    serialize(): [string, number][];

    /** Loads data from a save file */
    deserialize(data: [string, number][]): void;
}
```

Engine Integration
Instantiation: This is an optional system. The game's main entry point (e.g., createGame) will be responsible for instantiating this manager.

Context Access: The createGame function will add the instance to the engine.context for global access: engine.context.relationships = new RelationshipManager().

Usage:

Scene Effects: The Scene class's applyEffects method can be updated (by the game developer) to check for a new effect type, e.g., if (this.effects?.adjustRelationship) { context.relationships.adjustValue(...) }.

Action Execution: Game-specific Actions can call context.relationships.adjustValue('npc_bob', -5) within their execute method.

Scene Requirements: The Scene.canEnter method can be extended to check context.relationships against new requirements data.

Save/Load: The SaveManager (from Task 1) must be made aware of this system. Its saveGame method should call engine.context.relationships.serialize() and store the data. loadGame must call engine.context.relationships.deserialize() with the saved data.