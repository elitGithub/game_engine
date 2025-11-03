---

`TASK-04-EffectManager.md`
```markdown
# Task: Create a Visual Effects Manager

* **Task:** Create an `EffectManager` class.
* **Objective:** To provide a simple API for applying and removing CSS-based effects, abstracting the implementation (CSS classes) away from the game logic.

---

### Key Components

* **`engine/core/EffectManager.ts`**: A new class to manage a registry of effects and apply them to DOM elements.
* The provided CSS files (`effects-filters.css`, `effects-transitions.css`, `effects-xray.css`) will be used by this manager.

### Suggested API

```typescript
class EffectManager {
    constructor();

    /** Links a friendly name (e.g., 'xray') to one or more CSS classes */
    registerEffect(effectName: string, cssClass: string | string[]): void;

    /** Applies a registered effect to a DOM element */
    apply(element: HTMLElement, effectName: string, duration?: number): void;

    /** Removes a registered effect from a DOM element */
    remove(element: HTMLElement, effectName: string): void;

    /** Helper method to find a sprite by ID and apply an effect */
    applyToSprite(spriteId: string, effectName: string, duration?: number): void;
}
```
Engine Integration
Instantiation: The EffectManager is instantiated in the Engine constructor and added to the GameContext (e.g., this.context.effects = this.effectManager).

Registration: The game's main entry point (e.g., createGame) will be responsible for registering the game's available effects:

engine.context.effects.registerEffect('xray', 'xray-effect')

engine.context.effects.registerEffect('glitch', 'glitch')

engine.context.effects.registerEffect('fadeIn', 'fade-transition')

Usage:

The applyToSprite helper will need access to the context.renderer to find the sprite's DOM element. It will call (context.renderer as SpriteRenderer).getSprite(spriteId) to get the HTMLImageElement and then use the apply method on it.

Scene effects or Action logic can now simply call context.effects.applyToSprite('enemy', 'glitch', 1000) to make an enemy sprite glitch for 1 second.

This beautifully decouples your game logic from your CSS implementation.