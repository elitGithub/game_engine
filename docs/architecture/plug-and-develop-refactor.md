# Engine Core Refactor: Plug-and-Develop Architecture

## Problems We're Solving

### 1. TGame Generic Coupling
- TGame flows through GameContext, creating cascading type dependencies
- Core engine systems (StateManager, SceneManager, ActionRegistry, PluginManager) are tightly coupled to game-specific types
- Violates separation of concerns: engine layer knows about game layer
- Makes engine less reusable and harder to test in isolation

### 2. Initialization Brittleness
- SystemFactory has hard-coded initialization order
- Dependencies are implicit, not declared
- No way to swap implementations or customize system creation
- Adding new systems requires modifying engine core code

### 3. Limited Extensibility
- SystemFactory is a static class that cannot be extended
- SYSTEMS registry is a closed set - cannot add custom systems
- No dependency injection - all instantiation is hard-coded
- Plugins can extend context but cannot replace core systems
- No hooks for post-initialization setup

### 4. Unclear Boundaries
- SaveManager is treated as "core" but not all games need it
- Optional vs required systems are inconsistently handled
- No clear distinction between "engine infrastructure" and "game features"

## Vision & Goals

Transform the engine into a **plug-and-develop system** where:

1. **Developers never modify Engine.ts** - it becomes stable infrastructure
2. **Systems are added via configuration** - declarative, not imperative
3. **TGame is removed from engine layer** - complete decoupling
4. **Clear plugin/extension API** - well-defined, stable extension points
5. **Lazy-loading for optional systems** - only initialize what's used
6. **Dependency injection** - systems declare dependencies explicitly

## Success Criteria

### Architecture
- [ ] Engine layer has no knowledge of TGame generic
- [ ] Developers can add custom systems without modifying Engine.ts
- [ ] Systems can be configured/added through configuration only
- [ ] Clear, documented extension API for plugins and custom systems
- [ ] SaveManager and other optional systems are lazy-loaded
- [ ] Dependency resolution happens automatically based on declarations

### Code Quality
- [ ] **All existing tests pass or are properly updated**
- [ ] **No code errors or TypeScript errors**
- [ ] **New functionality has test coverage**
- [ ] Tests validate architectural goals (decoupling, extensibility)
- [ ] Code follows established patterns and style

### Developer Experience
- [ ] Documentation clearly explains how to add custom systems
- [ ] Configuration format is simple and intuitive
- [ ] Error messages guide developers when configuration is invalid
- [ ] Examples demonstrate common extension scenarios

## Architectural Principles

### Separation of Concerns

**Engine Layer (Infrastructure):**
- System registry and lifecycle management
- Core abstractions (EventBus, Registry, Context)
- Initialization orchestration
- No knowledge of game-specific types

**Game Layer (Application):**
- Game state implementations
- Scenes, actions, entities
- Game-specific managers
- Uses TGame for type safety

### Dependency Injection

Systems should:
- Declare their dependencies explicitly
- Be instantiated by a factory/container
- Receive dependencies through constructor injection
- Not reach into global state or create their own dependencies

### Configuration Over Code

Prefer:
- Declarative configuration: `{ systems: { save: true, audio: { enabled: true } } }`
- Over imperative code: `new SaveManager(...)`

### Lazy Loading

Optional systems should:
- Only be instantiated when configured/needed
- Not consume resources if unused
- Initialize on first access when possible

## Design Constraints

### Must Preserve
- Symbol-based system keys (SYSTEMS)
- GameContext pattern for passing state
- Plugin system architecture
- Event bus for loose coupling
- Type safety where it doesn't create coupling
- Existing public APIs (minimize breaking changes)

### Must Change
- SystemFactory from static class to extensible pattern
- TGame coupling in core engine systems
- Hard-coded initialization order
- Closed SYSTEMS registry

### Must Add
- Dependency declaration mechanism
- System factory registration
- Post-initialization hooks
- Custom system registration API

## Testing Requirements

Testing is **non-negotiable** and **first-class** in this refactor.

### Test Coverage Requirements
- All core systems must have unit tests
- Integration tests for system initialization flow
- Tests for plugin/extension scenarios
- Tests for lazy-loading behavior
- Tests for dependency resolution

### Test Quality Standards
- Tests must be clear and maintainable
- Tests must validate behavior, not implementation details
- Tests must cover error cases and edge cases
- Tests must run quickly (use mocks/stubs appropriately)

### Refactoring Process
1. **Before refactoring**: Ensure all current tests pass
2. **During refactoring**: Update tests as architecture changes
3. **After refactoring**: All tests must pass with new architecture
4. **New features**: Write tests before or alongside implementation

### What We Test
- System initialization and lifecycle
- Dependency resolution
- Configuration parsing and validation
- Lazy-loading behavior
- Plugin registration and extension
- Error handling and edge cases
- Type safety (TypeScript compiler as first test)
- Integration between systems

### Acceptance
**No code is complete until tests pass.** If refactoring breaks tests, either:
1. Update tests to reflect new architecture (if old tests were testing implementation details)
2. Fix the refactored code (if tests were validating correct behavior)

## Questions to Answer During Implementation

### Architecture Questions
1. How do we decouple TGame from core systems while maintaining type safety in game layer?
2. What's the right abstraction for dependency injection? (Service locator? DI container? Factory registry?)
3. How do we make SYSTEMS registry extensible while maintaining type safety?
4. Should we use interfaces for all systems to enable substitution?
5. How do we handle circular dependencies between systems?

### Initialization Questions
1. What's the initialization lifecycle? (register → instantiate → configure → initialize → ready)
2. How do systems declare dependencies?
3. When does lazy-loading happen? (config-time? first-access? explicit-load?)
4. How do we ensure initialization order is correct based on dependencies?

### API Questions
1. What does the configuration format look like?
2. How do developers register custom systems?
3. What's the plugin API for adding systems?
4. How do we maintain backward compatibility?

### Testing Questions
1. How do we mock/stub systems for isolated testing?
2. What integration test scenarios are critical?
3. How do we test configuration validation?
4. How do we test error paths?

## Validation Checklist

Before considering this refactor complete, validate:

### Decoupling Validation
- [ ] Search codebase for `TGame` - should only appear in game layer
- [ ] Engine.ts can be imported and tested without game-specific types
- [ ] Core systems (EventBus, Registry, etc.) are game-agnostic

### Extensibility Validation
- [ ] Create a custom system without modifying Engine.ts
- [ ] Add a custom system through configuration
- [ ] Replace a default system with custom implementation
- [ ] Add post-initialization hooks to a system

### Configuration Validation
- [ ] Configure a minimal engine (only required systems)
- [ ] Configure a full-featured engine (all optional systems)
- [ ] Lazy-load optional systems on first access
- [ ] Validate error messages for invalid configuration

### Testing Validation
- [ ] All tests pass (`nx run-many -t test`)
- [ ] No TypeScript errors (`nx run-many -t lint`)
- [ ] Code coverage meets or exceeds previous levels
- [ ] New tests demonstrate architectural improvements

### Documentation Validation
- [ ] README or docs explain new architecture
- [ ] Extension API is documented with examples
- [ ] Migration guide for any breaking changes
- [ ] Configuration schema is documented

## Guiding Philosophy

> "When the project is complete, developers should only add systems they need, not modify the engine itself."

Every decision should be evaluated against this principle. If a design choice requires developers to modify Engine.ts or SystemFactory, it's not aligned with the vision.

Ask constantly: **"Can a developer do this through configuration/plugins, or do they need to modify engine code?"**

If the answer is "modify engine code," the design needs refinement.
