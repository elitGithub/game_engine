# Game Engine Architecture

> **Version**: 2.0 (Post-Refactor)
> **Last Updated**: 2025-01-09

## Overview

This is a **plug-and-develop game engine** built with TypeScript for creating interactive narrative and adventure games. The engine provides a robust, tested foundation that developers extend through configuration and plugins—**without modifying engine code**.

## Core Vision

### Guiding Principle

> "Developers should only add systems they need, not modify the engine itself."

The engine is designed to be:
- **Invisible infrastructure** that just works
- **Extensible** through plugins and configuration
- **Unopinionated** about game structure
- **Robust** with comprehensive test coverage
- **Type-safe** where it doesn't create coupling

### Architecture Goals

1. **Decoupled Layers**: Clear separation between engine (infrastructure) and game (application)
2. **Configuration Over Code**: Declarative system setup
3. **Dependency Injection**: Systems declare dependencies explicitly
4. **Lazy Loading**: Optional systems only initialize when needed
5. **Extensibility**: Add custom systems without touching engine code

## Layer Separation

### Engine Layer (Hands Off)

**Location**: `/engine/`

The engine layer provides core infrastructure:

- **System Management**: Lifecycle, dependency injection, registry
- **Core Abstractions**: EventBus, Registry pattern, Context
- **Rendering Pipeline**: Scene, UI, Text renderers
- **Asset Management**: Centralized asset loading and caching
- **Type Definitions**: Interfaces and type utilities

**Key Point**: This layer is **game-agnostic**. It has no knowledge of specific game types or content.

**Developer Action**: Don't modify. Only configure and extend.

### Game Layer (Developer Focus)

**Location**: `/game/` (your game project)

The game layer contains application-specific code:

- **Game State Implementations**: Your specific game states
- **Scenes**: Your story scenes and interactions
- **Actions**: Game-specific action implementations
- **Plugins**: Custom game systems
- **Assets**: Images, audio, localization data
- **Configuration**: Engine setup for your game

**Developer Action**: This is where you build your game.

## Core Architecture Concepts

### 1. Dependency Injection (SystemContainer)

Systems declare their dependencies explicitly:

```typescript
const systemDefinition: SystemDefinition = {
  key: SYSTEMS.AUDIO_MANAGER,
  dependencies: [SYSTEMS.ASSET_MANAGER], // Declare what you need
  factory: (container) => {
    const assetManager = container.get(SYSTEMS.ASSET_MANAGER);
    return new AudioManager(assetManager);
  }
};
```

**Benefits:**
- Automatic initialization order
- Circular dependency detection
- Testable (easy to mock dependencies)
- Clear dependency graph

### 2. Type Safety Without Coupling

The engine uses two context types:

```typescript
// Engine layer - untyped, generic
interface GameContext {
  player: any;
  flags: FlagTracker;
  eventBus: EventBus;
  // ... other systems
}

// Game layer - typed for your game
interface MyGame {
  player: PlayerCharacter;
  inventory: Inventory;
  currentQuest: Quest;
}

type TypedGameContext<TGame> = GameContext & { game: TGame };
```

**How it works:**
- Engine systems use `GameContext` (no game-specific knowledge)
- Game code uses `TypedGameContext<MyGame>` (full type safety)
- Completely decoupled, fully type-safe

### 3. Plugin System

Add functionality without modifying the engine:

```typescript
const myPlugin: GamePlugin = {
  name: 'CustomSystemPlugin',
  install: (context: GameContext) => {
    // Add custom systems, listen to events, extend context
    context.eventBus.on('scene:loaded', handleSceneLoad);
  }
};

// In your game setup
engine.plugin(myPlugin);
```

### 4. Event-Driven Communication

Loose coupling through EventBus:

```typescript
// Publisher (doesn't know who's listening)
context.eventBus.emit('quest:completed', { questId: 'main_quest_1' });

// Subscriber (doesn't know who published)
context.eventBus.on('quest:completed', (data) => {
  // Update UI, trigger rewards, etc.
});
```

### 5. System Registry

Symbol-based system lookup:

```typescript
// Core systems (engine-provided)
const sceneManager = context.registry.get(SYSTEMS.SCENE_MANAGER);

// Custom systems
const CUSTOM_SYSTEM = createSystemKey('CUSTOM_SYSTEM');
context.registry.register(CUSTOM_SYSTEM, myCustomSystem);
```

## How to Use This Engine

### For New Game Developers

1. **Install the engine** as a dependency
2. **Configure which systems you need**:
   ```typescript
   const engine = new Engine({
     containerId: 'game',
     systems: {
       save: true,          // Enable save system
       audio: true,         // Enable audio
       localization: true,  // Enable i18n
     }
   });
   ```
3. **Create your game layer**:
   - Define your game state type
   - Create scenes
   - Register actions
   - Add plugins for game-specific features
4. **Never touch `/engine` directory**

### For Engine Extension

#### Adding a Custom System

```typescript
// 1. Create your system
class MyCustomSystem {
  constructor(private eventBus: EventBus) {}

  doSomething() {
    this.eventBus.emit('custom:event');
  }
}

// 2. Create a system key
const MY_SYSTEM = createSystemKey('MY_CUSTOM_SYSTEM');

// 3. Register via plugin
const myPlugin: GamePlugin = {
  name: 'MySystemPlugin',
  install: (context) => {
    const system = new MyCustomSystem(context.eventBus);
    context.registry.register(MY_SYSTEM, system);
  }
};

// 4. Use in your game
engine.plugin(myPlugin);
```

#### Creating a Plugin

Plugins can:
- Add new systems
- Listen to engine events
- Extend game context
- Register renderers or effects
- Add middleware or hooks

See `/docs/architecture/plugin-guide.md` for detailed examples.

## Core Systems Reference

### Always Available (Core)

- **EventBus**: Event-driven communication
- **StateManager**: Game state lifecycle
- **SceneManager**: Scene rendering and transitions
- **ActionRegistry**: Action registration and execution
- **PluginManager**: Plugin lifecycle management

### Optional (Configurable)

- **SaveManager**: Save/load game state
- **AudioManager**: Audio playback
- **AssetManager**: Asset loading and caching
- **EffectManager**: Visual effects (CSS, animations)
- **LocalizationManager**: i18n support
- **InputManager**: Input handling (keyboard, mouse)

### Game-Specific (Via Plugins)

- **RelationshipManager**: NPC relationship tracking
- **GameClock**: In-game time system
- **InventoryManager**: Item management
- *Your custom systems*

## File Structure

```
/engine/
  /core/              # Core infrastructure
    Engine.ts         # Main engine class
    SystemContainer.ts    # Dependency injection
    SystemFactory.ts      # System creation
    SystemRegistry.ts     # System lookup
    GameStateManager.ts   # State lifecycle
    PluginManager.ts      # Plugin management
  /systems/           # Built-in systems
    SceneManager.ts
    AudioManager.ts
    SaveManager.ts
    # ...
  /rendering/         # Rendering pipeline
    SceneRenderer.ts
    UIRenderer.ts
    TextRenderer.ts
  /types/             # Type definitions
    index.ts          # Core types
    EffectTypes.ts
    # ...
  /tests/             # Engine tests (349 tests)

/game/                # Your game code
  /states/            # Game state implementations
  /scenes/            # Scene definitions
  /actions/           # Action implementations
  /plugins/           # Custom plugins
  /assets/            # Game assets
  main.ts             # Game entry point

/docs/
  /architecture/      # Architecture documentation
    README.md         # This file
    plug-and-develop-refactor.md  # Refactor history
```

## Development Principles

### 1. Test Everything

All engine code must have tests. Currently: **349 tests passing**.

```bash
npm test              # Run all tests
npm run test:ui       # Visual test runner
npm run check:types   # Type checking
```

### 2. Clear APIs

Every system should have:
- Clear, single responsibility
- Documented public methods
- Type-safe interfaces
- Example usage in tests

### 3. Fail Fast

- Validate configuration early
- Throw descriptive errors
- Detect circular dependencies
- Check missing dependencies

### 4. Backward Compatibility

Breaking changes require:
- Migration guide
- Deprecation warnings
- Version bump

## Next Steps

- **New to this engine?** Read `/docs/getting-started.md`
- **Building a game?** See `/docs/game-development-guide.md`
- **Creating plugins?** Check `/docs/architecture/plugin-guide.md`
- **Contributing?** Review `/docs/contributing.md`

## Architecture Decisions

For detailed reasoning behind architectural choices, see:
- [Plug-and-Develop Refactor](./plug-and-develop-refactor.md) - The journey to v2.0
- [System Design Patterns](./system-patterns.md) - Common patterns used
- [Testing Strategy](./testing-strategy.md) - How we ensure quality

## Questions?

Check the [FAQ](../FAQ.md) or review the inline documentation in the code. Every major class has TSDoc comments explaining its purpose and usage.
