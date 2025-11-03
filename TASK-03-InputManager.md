---

`TASK-03-InputManager.md`
```markdown
# Task: Refactor for Centralized Input System

* **Task:** Create an `InputManager` and refactor input handling.
* **Objective:** To remove all disparate input listeners and centralize them in a single manager that captures browser events and delegates them to the active `GameState` for interpretation.

---

### Key Components

* **`engine/core/InputManager.ts`**: A new class that attaches and manages all browser event listeners (e.g., `click`, `keydown`, `mousemove`).
* **`types/index.ts`**: Add new types for input events (e.g., `type EngineEvent = ClickEvent | KeyEvent`).
* **`engine/core/GameState.ts`**: **Refactor** this class's `handleInput` method.
* **`engine/Engine.ts`**: **Refactor** this class to remove the old `handleInput` method.

### Suggested API

```typescript
// InputManager is an internal class, it doesn't need a public API
// besides its constructor.
class InputManager {
    constructor(engine: Engine, targetElement: HTMLElement);

    // Internal methods
    private onClick(event: MouseEvent): void;
    private onKey(event: KeyboardEvent): void;
}

// In types/index.ts
export interface ClickEvent {
    type: 'click';
    x: number;
    y: number;
    target: EventTarget | null;
}
export interface KeyEvent {
    type: 'key';
    key: string;
}
export type EngineEvent = ClickEvent | KeyEvent;
```
Engine Integration
Instantiation: The InputManager is created in the Engine.start() method, as it needs the game's DOM container (which might not exist at construction).

Refactoring Engine:

The public Engine.handleInput(input: string) method must be removed.

A new internal method, Engine.dispatchInput(event: EngineEvent), should be created. This is what the InputManager will call.

Engine.dispatchInput will simply call this.stateManager.handleInput(event).

Refactoring GameState:

The GameState.handleInput(input: string) method signature must be changed to handleInput(event: EngineEvent).

All game-specific states (like StoryState) must be updated. Instead of receiving a simple string, they will now receive a rich event object.

Cleaning Up SpriteRenderer:

The onClick property in SpriteConfig must be removed.

The responsibility now lies with the active GameState. In its new handleInput(event) method, it will check if (event.type === 'click') and then determine if event.x, event.y collides with any of its managed sprites or UI elements.