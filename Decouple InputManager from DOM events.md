Here are the tasks to decouple the `InputManager` from DOM events, formatted for `Decouple InputManager from DOM events.txt`.

````text
TASK: Decouple InputManager from DOM events

Objective:
Refactor the InputManager to remove all direct dependencies on DOM APIs (like 'addEventListener', 'KeyboardEvent', 'MouseEvent'). All DOM-specific logic will be moved to a new 'DomInputAdapter' class, making the InputManager platform-independent.

---

### Step 1: Create the new 'DomInputAdapter' class

1.  Create a new file: `engine/core/DomInputAdapter.ts`.
2.  Define a new class `DomInputAdapter`.
3.  The constructor of `DomInputAdapter` should accept an `InputManager` instance and store it as a private property (e.g., `private inputManager: InputManager`).

### Step 2: Move DOM-specific properties from InputManager to DomInputAdapter

Cut the following properties from `engine/systems/InputManager.ts` and paste them into `engine/core/DomInputAdapter.ts`:

* `private targetElement: HTMLElement | null;`
* `private boundListeners: Map<string, EventListener>;` (This should be typed as `Map<string, (evt: any) => void>` to fix the type mismatch).

### Step 3: Move DOM-specific methods from InputManager to DomInputAdapter

Cut the following methods from `engine/systems/InputManager.ts` and paste them into `engine/core/DomInputAdapter.ts`:

* `attach(element: HTMLElement, ...)`
* `detach()`
* `attachListeners()`
* `onKeyDown(e: KeyboardEvent)`
* `onKeyUp(e: KeyboardEvent)`
* `onMouseDown(e: MouseEvent)`
* `onMouseUp(e: MouseEvent)`
* `onMouseMove(e: MouseEvent)`
* `onWheel(e: WheelEvent)`
* `onClick(e: MouseEvent)`
* `onTouchStart(e: TouchEvent)`
* `onTouchMove(e: TouchEvent)`
* `onTouchEnd(e: TouchEvent)`

### Step 4: Refactor DomInputAdapter handlers to translate events

Modify all the `on...` methods (like `onKeyDown`) inside `DomInputAdapter.ts`. Their new job is to translate the raw DOM event into an engine-agnostic event and pass it to the `InputManager`.

**Example for `onKeyDown`:**

```typescript
// Inside DomInputAdapter.ts
import type { KeyDownEvent } from '@engine/core/InputEvents';

private onKeyDown(e: KeyboardEvent): void {
    // 1. Translate from DOM Event (KeyboardEvent) to Engine Event (KeyDownEvent)
    const event: KeyDownEvent = {
        type: 'keydown',
        timestamp: Date.now(),
        key: e.key,
        code: e.code,
        repeat: e.repeat,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        meta: e.metaKey
    };

    // 2. Pass the translated event to the InputManager
    this.inputManager.processEvent(event);
}

// (Repeat this translation process for all other 'on...' handlers)
````

### Step 5: Refactor InputManager to consume engine events

Modify `engine/systems/InputManager.ts`:

1.  Remove all the properties and methods moved in Steps 2 & 3.
2.  Add a new public method: `public processEvent(event: EngineInputEvent): void`.
3.  This method will contain the logic *formerly* in the `on...` handlers.
4.  Use a `switch (event.type)` block to handle the different events.

**Example for `processEvent`:**

```typescript
// Inside InputManager.ts
import type { EngineInputEvent } from '../core/InputEvents';

public processEvent(event: EngineInputEvent): void {
    if (!this.enabled) return;

    // This logic is moved from the old onKeyDown, onKeyUp, etc.
    switch (event.type) {
        case 'keydown':
            this.state.keysDown.add(event.key);
            this.addToBuffer(event.key);
            this.dispatchEvent(event, true);
            this.checkActionTriggers('key', event.key, {
                shift: event.shift,
                ctrl: event.ctrl,
                alt: event.alt,
                meta: event.meta
            });
            break;

        case 'keyup':
            this.state.keysDown.delete(event.key);
            this.dispatchEvent(event, false);
            break;

        case 'mousedown':
            this.state.mouseButtonsDown.add(event.button);
            this.addToBuffer(`mouse${event.button}`);
            this.dispatchEvent(event, true);
            // ... (etc.)
            break;
        
        // ... (cases for mouseup, mousemove, click, touch, etc.)
    }
}
```

### Step 6: Update SystemFactory to create and attach the adapter

Modify `engine/core/SystemFactory.ts`:

1.  Inside the `static create(...)` method, in the block where `InputManager` is created (line \~168):
2.  After creating `inputManager`, create the `DomInputAdapter` and pass `inputManager` to it.
3.  If `containerElement` exists, call the adapter's `attach` method.

**Example for `SystemFactory.ts`:**

```typescript
// Inside SystemFactory.ts, around line 168
// ... (Import DomInputAdapter at the top)
import { DomInputAdapter } from '../core/DomInputAdapter'; // (Path may vary)

// InputManager (depends on: StateManager, EventBus)
if (config.input !== false) {
    const stateManager = registry.get<GameStateManager>(SYSTEMS.StateManager);
    const eventBus = registry.get<EventBus>(SYSTEMS.EventBus);

    const inputManager = new InputManager(stateManager, eventBus);
    registry.register(SYSTEMS.InputManager, inputManager);

    // --- NEW LOGIC ---
    // If a container is provided, create and attach the DOM adapter
    if (containerElement) {
        const inputAdapter = new DomInputAdapter(inputManager);
        // We can pass options here if needed, e.g., for tabindex
        inputAdapter.attach(containerElement, { tabindex: '0' }); 
        // Note: We don't store the adapter in the registry, 
        // as it's a private implementation detail of this setup.
    }
    // --- END NEW LOGIC ---
}
```