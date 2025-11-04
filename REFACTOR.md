### Phase 2 Refactor: Decoupled Rendering Pipeline

This epic focuses on re-architecting the rendering engine to be more robust, abstract, and extensible.

**1. Create Centralized `AssetManager`**
- [ ] **Task:** Create a new `engine/systems/AssetManager.ts` class.
    - **Goal:** This class will be the *only* system responsible for loading and caching all game assets (images, JSON data, audio, localization strings).
- [ ] **Task:** Define generic `AssetLoader` interfaces (e.g., `IAssetLoader`) that the `AssetManager` can use to handle different asset types.
- [ ] **Task:** Refactor `AudioManager` to *use* the `AssetManager` to get `AudioBuffer`s instead of loading them via its own `AudioSourceAdapter`.
- [ ] **Task:** Remove `preloadImages` from `SpriteRenderer`, as this will now be the `AssetManager`'s job.

**2. Split `SpriteRenderer` into `SceneRenderer` and `UIRenderer`**
- [ ] **Task:** Create `engine/rendering/SceneRenderer.ts`.
    - **Goal:** This class will extend `BaseRenderer` and be responsible *only* for rendering the layered "game world" (backgrounds, characters, world objects, hotspots).
    - It will fetch assets from the new `AssetManager`.
    - It must not contain any `onClick` logic.
- [ ] **Task:** Create `engine/rendering/UIRenderer.ts`.
    - **Goal:** This class will extend `BaseRenderer` and manage a separate DOM layer *on top of* the `SceneRenderer` for all 2D interface elements (menus, HUD, buttons).
    - It will fetch assets from the new `AssetManager`.
    - It must not contain any `onClick` logic.
- [ ] **Task:** Delete `engine/rendering/SpriteRenderer.ts` once its functionality is fully replaced.

**3. Decouple Text Animation from `TextRenderer`**
- [ ] **Task:** Refactor `TextRenderer`.
    - **Goal:** Its `render` method should be simplified to *only* create the final DOM structure (speaker, text element) and apply styles. It should no longer call the `TypewriterEffect`.
- [ ] **Task:** Refactor `TypewriterEffect` to implement the `IDynamicEffect` interface.
- [ ] **Task:** Register the refactored `TypewriterEffect` with the `EffectManager`.
    - **Goal:** The `GameState` will now be responsible for applying the animation:
        1.  `const el = textRenderer.render(...)`
        2.  `effectManager.apply(el, 'typewriter', ...)`
- [ ] **Task:** (Optional) Create a new `TextFadeInEffect` that also implements `IDynamicEffect` to provide an alternative animation.

**4. Decouple Interaction Logic from Renderers**
- [ ] **Task:** Update the new `SceneRenderer` and `UIRenderer` to add `data-` attributes to all clickable elements (e.g., `data-scene-id="door"` or `data-ui-action="open_inventory"`).
- [ ] **Task:** Update `InputManager` (or its `onClick` listener) to check for these `data-` attributes on event targets.
- [ ] **Task:** When a click on a tracked element occurs, the `InputManager` should fire a generic event on the `EventBus` (e.g., `eventBus.emit('ui.click', { action: 'open_inventory' })` or `eventBus.emit('scene.click', { id: 'door' })`).
- [ ] **Task:** All game logic for handling these clicks must reside in the `GameState`, which will listen for the new `EventBus` events.

**5. Implement Localization (i18n) System**
- [ ] **Task:** Create `engine/systems/LocalizationManager.ts`.
    - **Goal:** This system will store the currently loaded language strings and provide a getter (e.g., `loc.getString('ui.main_menu.start')`).
- [ ] **Task:** Update the `AssetManager` to be able to load JSON language files and pass their contents to the `LocalizationManager`.
- [ ] **Task:** Refactor all renderers (`TextRenderer`, `UIRenderer`) to check if a string is a localization key. If it is, they should request the final string from the `LocalizationManager` before rendering.