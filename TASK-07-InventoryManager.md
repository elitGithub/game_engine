---

`TASK-07-InventoryManager.md`
```markdown
# Task: Implement a Generic Inventory/Item System

* **Task:** Create a basic `InventoryManager` class and `Item` base interface.
* **Objective:** To provide a generic, engine-level system for managing collections of items (adding, removing, checking quantities), separating this logic from any specific "Player" class.

---

### Key Components

* **`engine/systems/InventoryManager.ts`**: A new class that manages a collection of items and their quantities.
* **`types/index.ts`**: Add a base `Item` interface. The *game* will extend this, but the *engine* provides the generic structure.

### Suggested API

```typescript
// In types/index.ts
export interface BaseItem {
    id: string;
    name: string;
    description: string;
    isStackable: boolean;
    // ... other common properties ...
}

// In InventoryManager.ts
class InventoryManager {
    // Stores item quantities, e.g., Map<'health_potion', 5>
    private items: Map<string, number>;
    // (Optional) Stores a reference to all known item definitions
    private itemDatabase: Map<string, BaseItem>; 

    constructor();
    
    /** (Optional) Loads all item definitions for the game */
    registerItemDefinitions(items: BaseItem[]): void;

    /** Adds one or more of an item to the inventory */
    addItem(itemId: string, quantity: number = 1): boolean;

    /** Removes one or more of an item from the inventory */
    removeItem(itemId: string, quantity: number = 1): boolean;

    /** Checks if the inventory has at least a certain quantity */
    hasItem(itemId: string, quantity: number = 1): boolean;

    /** Gets the quantity of a specific item */
    getQuantity(itemId: string): number;

    /** Returns all items in the inventory */
    getAllItems(): Map<string, number>;

    /** Returns all data for serialization (e.g., for saving) */
    serialize(): [string, number][];

    /** Loads data from a save file */
    deserialize(data: [string, number][]): void;
}
```
Engine Integration
Instantiation: This is an optional system. A game would instantiate this class where it's needed.

A Player class (part of the game, not the engine) would instantiate it: this.inventory = new InventoryManager().

A "shop" scene state might instantiate one: this.shopInventory = new InventoryManager().

Context Access: The game is responsible for deciding where this lives. The most common pattern is for the Player object (in engine.context.player) to own an instance, making it accessible via context.player.inventory.

Usage:

Scene Requirements: This makes the existing Scene.canEnter logic much cleaner. It no longer needs custom logic; it just calls: if (this.requirements.hasItem) { return context.player.inventory.hasItem(this.requirements.hasItem) }.

Scene Effects: Scene.applyEffects can be updated to check for effects.giveItem and call: context.player.inventory.addItem(this.effects.giveItem).

Actions: An Action (e.g., UsePotionAction) can now have canExecute check context.player.inventory.hasItem('potion') and execute call context.player.inventory.removeItem('potion').

Save/Load: The SaveManager (Task 1) would need to serialize the player's inventory by calling engine.context.player.inventory.serialize(). The Player's load logic would then call this.inventory.deserialize().