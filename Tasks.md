# Immediate Tasks - Engine Core Completion

> **Goal**: Complete the decoupling process and prepare for mono-repo structure
>
> **Philosophy**: ZERO hardcoding. FULL DI/Service Container. Games decide everything.

---

## 🔴 PHASE 1: Audit & Design (CURRENT)

### TASK 1: Audit DOM Dependencies
**STATUS**: PENDING
**Priority**: CRITICAL

Identify ALL places where the engine core is coupled to DOM:
- Search for `document.*`, `window.*`, `HTMLElement`, etc.
- Find hardcoded event listeners (`addEventListener`, `click`, `keydown`)
- Locate CSS assumptions and DOM-specific rendering
- List browser API usage (localStorage, fetch, etc.)
- Document which systems MUST be platform-agnostic vs which can be DOM-specific

**Deliverable**: `AUDIT_REPORT.md` with categorized findings

---

### TASK 2: Design Renderer Abstraction
**STATUS**: PENDING
**Priority**: CRITICAL

Create a renderer-agnostic interface that engine depends on:

```typescript
interface IRenderer {
  // Scene rendering
  renderScene(scene: SceneData): void;
  clearScene(): void;

  // UI rendering
  renderUI(elements: UIElement[]): void;

  // Text rendering
  renderText(text: string, options: TextOptions): void;

  // Asset handling
  loadAsset(asset: Asset): Promise<void>;

  // Lifecycle
  initialize(container: unknown): Promise<void>;
  dispose(): void;
}
```

**Sub-tasks**:
- Define complete IRenderer interface
- Define IInputProvider interface
- Define IPlatformAdapter interface (storage, audio, etc.)
- Document contracts and guarantees

**Deliverable**: `engine/interfaces/RendererInterface.ts`

---

### TASK 3: Design Input Abstraction
**STATUS**: PENDING
**Priority**: CRITICAL

Replace hardcoded DOM events with action-based input system:

```typescript
interface IInputProvider {
  // Abstract actions, not concrete events
  onAction(action: InputAction, handler: Function): void;
  offAction(action: InputAction, handler: Function): void;
}

type InputAction =
  | 'move-up' | 'move-down' | 'move-left' | 'move-right'
  | 'select' | 'cancel' | 'action' | 'menu'
  | 'interact' | 'inventory';
```

**Sub-tasks**:
- Define InputAction types
- Create action mapping system
- Support multiple input sources (keyboard, gamepad, touch, mouse)
- Design configurable input bindings

**Deliverable**: `engine/interfaces/InputInterface.ts`

---

## 🟡 PHASE 2: Implementation (NEXT)

### TASK 4: Implement Platform Abstraction Layer
**STATUS**: PENDING
**Priority**: HIGH

Extract ALL platform-specific code into adapters:

**Adapters to create**:
- `DomRenderer implements IRenderer` - DOM-based rendering
- `CanvasRenderer implements IRenderer` - Canvas-based rendering
- `DomInputProvider implements IInputProvider` - Keyboard/mouse input
- `CanvasInputProvider implements IInputProvider` - Canvas-specific input
- `GamepadInputProvider implements IInputProvider` - Gamepad support
- `BrowserStorageAdapter implements IStorageAdapter` - LocalStorage/IndexedDB
- `WebAudioAdapter implements IAudioAdapter` - Web Audio API

**Deliverable**: Fully abstracted engine core with platform adapters

---

### TASK 5: Refactor Engine Core to Use Abstractions
**STATUS**: PENDING
**Priority**: HIGH

Remove ALL direct platform dependencies from engine core:
- Engine constructor takes `IRenderer`, `IInputProvider`, `IPlatformAdapter`
- SystemFactory creates systems using injected adapters
- No more `document.*` or `window.*` in core engine files
- All rendering goes through IRenderer interface
- All input goes through IInputProvider interface

**Validation**:
- Engine core has ZERO direct DOM dependencies
- Engine can be instantiated with mock adapters for testing
- Same engine code works with DOM or Canvas renderer

---

## 🟢 PHASE 3: Mono-repo Refactor (FINAL)

### TASK 6: Nx Monorepo Structure
**STATUS**: PENDING
**Priority**: MEDIUM

**New Structure**:
```
game-engine/
  packages/
    core/                      # @game-engine/core
      src/
        Engine.ts
        core/
        systems/
        interfaces/

    renderers/
      dom-renderer/            # @game-engine/dom-renderer
      canvas-renderer/         # @game-engine/canvas-renderer
      hybrid-renderer/         # @game-engine/hybrid-renderer

    input-providers/
      keyboard-mouse/          # @game-engine/keyboard-mouse
      gamepad/                 # @game-engine/gamepad
      touch/                   # @game-engine/touch

    plugins/
      quest-system/            # @game-engine/quest-system
      battle-system/           # @game-engine/battle-system
      inventory/               # @game-engine/inventory
      dialogue/                # @game-engine/dialogue
      achievements/            # @game-engine/achievements
      stats-skills/            # @game-engine/stats-skills
      magic-system/            # @game-engine/magic-system

    examples/
      text-adventure/          # DOM-based example
      rpg-battle/              # Canvas-based example
      visual-novel/            # Hybrid example
```

**Sub-tasks**:
- Set up Nx workspace
- Configure build pipeline
- Set up inter-package dependencies
- Configure testing across packages
- Set up changesets for versioning

**Deliverable**: Working mono-repo with all packages building

---

## 📋 Success Criteria

- [ ] Engine core has ZERO platform-specific code
- [ ] Same engine works with DOM, Canvas, or custom renderer
- [ ] All input is action-based, not event-based
- [ ] Full dependency injection - no hardcoded dependencies
- [ ] Games configure everything via DI container
- [ ] Tests run without DOM (using mocks)
- [ ] Mono-repo builds and tests pass
- [ ] Documentation updated for new architecture

---

## 🎯 End State

**Game developers will**:
```typescript
// Configure their renderer
const renderer = new CanvasRenderer(canvas);

// Configure their input
const input = new GamepadInputProvider();

// Configure platform adapter
const platform = new BrowserPlatformAdapter();

// Engine takes dependencies via DI
const engine = new Engine({
  renderer,
  input,
  platform,
  systems: {
    quest: true,
    battle: true,
    inventory: true
  }
});
```

**NO hardcoding. NO assumptions. FULL control.**
