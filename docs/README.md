# Game Engine Documentation

Welcome to the game engine documentation. This engine is designed as a **plug-and-develop** system where you extend functionality through configuration and plugins, not by modifying engine code.

## Quick Links

### Getting Started
- **[Architecture Overview](./architecture/README.md)** - **Start here!** Understand the vision, goals, and core concepts
- **[Plugin Development Guide](./architecture/plugin-guide.md)** - Learn how to extend the engine
- **[Refactor History](./architecture/plug-and-develop-refactor.md)** - How we got to v2.0

### For Game Developers

*Coming soon:*
- Getting Started Guide
- Game Development Tutorial
- Scene Creation Guide
- Action System Guide
- Asset Management Guide

### For Contributors

*Coming soon:*
- Contributing Guidelines
- Testing Strategy
- Code Style Guide
- Release Process

## Documentation Structure

```
docs/
  README.md                    # This file
  /architecture/
    README.md                  # Architecture overview (READ THIS FIRST)
    plugin-guide.md            # How to create plugins
    plug-and-develop-refactor.md  # Refactor history and decisions
```

## Core Concepts

### The Engine is Infrastructure

Think of this engine as invisible infrastructure, like a web framework. You configure it, extend it with plugins, and build your game on top—but you never modify the framework itself.

### Three Ways to Extend

1. **Configuration** - Enable/disable built-in systems
   ```typescript
   const engine = new Engine({
     systems: { save: true, audio: true }
   });
   ```

2. **Plugins** - Add new functionality
   ```typescript
   engine.plugin(QuestPlugin);
   engine.plugin(CombatPlugin);
   ```

3. **Game Layer** - Your scenes, actions, states
   ```typescript
   // Your game-specific code in /game directory
   ```

### Key Principles

- **Decoupled**: Engine layer has no knowledge of game types
- **Testable**: 349 tests ensure reliability
- **Type-Safe**: Full TypeScript support
- **Event-Driven**: Loose coupling via EventBus
- **Dependency Injection**: Systems declare dependencies explicitly

## Common Questions

### Do I need to understand the entire engine?

No! You only need to understand:
1. How to configure the engine for your game
2. How to create scenes and actions
3. How to use plugins for features you need

The engine's internal architecture is documented for contributors and those creating plugins.

### Can I modify the engine code?

You can, but you shouldn't need to. The architecture is designed so that everything you need can be done through:
- Configuration
- Plugins
- Custom game layer code

If you find yourself needing to modify engine code, consider:
1. Is this a bug? → File an issue
2. Is this a missing feature? → Create a plugin
3. Is this a general need? → Propose a PR for the engine

### How do I add game-specific features?

Create a plugin! See the [Plugin Development Guide](./architecture/plugin-guide.md) for detailed examples of:
- Quest systems
- Combat systems
- Achievement systems
- Day/night cycles
- And more

## Project Status

**Current Version**: 2.0 (Post-Refactor)
**Test Coverage**: 349 tests passing
**TypeScript**: Zero errors
**Architecture**: Plug-and-develop complete

See [Session State](../SESSION_STATE.md) for current development status.

## Need Help?

1. Check the [Architecture Overview](./architecture/README.md)
2. Review inline code documentation (TSDoc comments)
3. Look at test files for usage examples
4. Explore existing plugins in `/engine/plugins`

## Contributing

*Coming soon: Contributing guidelines*

For now:
- All engine changes require tests
- Follow existing code style
- Document public APIs with TSDoc
- See [Refactor History](./architecture/plug-and-develop-refactor.md) for architectural principles
