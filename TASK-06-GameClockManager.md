---

`TASK-06-GameClockManager.md`
```markdown
# Task: Implement a Game Clock / Time System

* **Task:** Create a `GameClockManager` class.
* **Objective:** To provide an optional manager for tracking in-game time (e.g., turns, hours, days) and triggering events based on time progression.

---

### Key Components

* **`engine/systems/GameClockManager.ts`**: A new class to manage the internal game clock.
* **`types/index.ts`**: (Optional) Add `context.clock` to the `GameContext` interface.

### Suggested API

```typescript
// Example config: { unitsPerDay: 24, initialDay: 1, initialUnit: 6 }
type ClockConfig = {
    unitsPerDay: number; 
    // ... other config ...
};

class GameClockManager {
    // Total units elapsed since start
    private absoluteTime: number;
    private unitsPerDay: number;
    private eventBus: EventBus; //

    constructor(config: ClockConfig, eventBus: EventBus);

    /** Advances the clock by a number of units (e.g., hours or turns) */
    advance(units: number): void;

    /** Gets the current time unit (e.g., 0-23 for hours) */
    getCurrentUnit(): number;

    /** Gets the current day number */
    getCurrentDay(): number;

    /** Gets the total time elapsed */
    getAbsoluteTime(): number;
    
    /** Checks if the current time is within a named range (e.g., 'night') */
    isTimeOfDay(rangeName: string): boolean;

    /** (Advanced) Registers a named time range (e.g., 'Night', 18, 6) */
    registerTimeOfDay(name: string, startUnit: number, endUnit: number): void;
    
    /** Returns all data for serialization (e.g., for saving) */
    serialize(): { absoluteTime: number };

    /** Loads data from a save file */
    deserialize(data: { absoluteTime: number }): void;
}
Engine Integration
Instantiation: This is an optional system. The game's createGame function will instantiate it, passing in the engine.eventBus.

Context Access: The createGame function will add the instance to the engine.context: engine.context.clock = new GameClockManager(config, engine.eventBus).

Usage:

Action Execution: The primary way to move time. An Action's execute method will call context.clock.advance(1) to signify that one "turn" or "hour" has passed.

Scene Effects: A Scene could have an effect advanceTime: 4 that its applyEffects method passes to context.clock.advance(4).

Event Emitter: When advance is called, the manager should check if a day has passed or a new time-of-day range has been entered. If so, it should use the eventBus to emit events like engine.eventBus.emit('clock.dayChanged', { newDay: 2 }) or engine.eventBus.emit('clock.timeOfDayChanged', { rangeName: 'night' }).

Scene Requirements: Other systems can listen for these events, or Scene.canEnter can be modified to directly check context.clock.isTimeOfDay('night').

Save/Load: The SaveManager (Task 1) must be updated to call engine.context.clock.serialize() when saving and engine.context.clock.deserialize() when loading.