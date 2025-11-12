# Plugin Development Guide

> Learn how to extend the game engine without modifying core code

## What Are Plugins?

Plugins are self-contained modules that extend the engine's functionality. They can:
- Add new systems (managers, trackers, utilities)
- Listen to engine events
- Register serializable state for save/load
- Provide reusable game features (timers, inventory, relationships, etc.)

## Plugin Architecture

### Current Architecture (Post-Refactor)

The engine uses a strict dependency injection pattern with **no global registry**. Plugins interact with the engine through the `IEngineHost` interface.

```typescript
interface IEnginePlugin<TGame = any> {
  name: string;
  version?: string;
  install(engine: IEngineHost<TGame>): void;
  uninstall?(engine: IEngineHost<TGame>): void;
  update?(deltaTime: number, context: TypedGameContext<TGame>): void;
}
```

### What IEngineHost Provides

```typescript
interface IEngineHost<TGame = any> {
  context: TypedGameContext<TGame>;
  eventBus: EventBus;
  registerSerializableSystem(key: string, system: ISerializable): void;
  unregisterSerializableSystem(key: string): void;
}
```

**Key Points:**
- Plugins receive `IEngineHost` (the engine interface), NOT `GameContext`
- No `SystemRegistry` - that was removed
- No `createSystemKey` - that pattern was deleted
- Systems register themselves directly via `engine.registerSerializableSystem()`

### Plugin Lifecycle

```
Engine.init() →
  PluginManager.register(plugin) →
  PluginManager.install(pluginName, engine) →
    plugin.install(engine) →
      Plugin registers systems, listeners, etc. →
    Plugin completes →
  Plugin installed
```

## Creating Your First Plugin

### Example: Simple Logger Plugin

```typescript
// plugins/LoggerPlugin.ts
import type { IEnginePlugin, IEngineHost } from '@engine/types';

export class LoggerPlugin implements IEnginePlugin {
  name = 'logger';
  version = '1.0.0';

  install(engine: IEngineHost): void {
    // Listen to engine events
    engine.eventBus.on('scene.changed', (data) => {
      console.log(`Scene changed to: ${data.sceneId}`);
    });

    engine.eventBus.on('input.keydown', (event) => {
      console.log(`Key pressed: ${event.key}`);
    });
  }

  // Optional cleanup
  uninstall(engine: IEngineHost): void {
    // Remove listeners if needed
  }
}

// Usage
const loggerPlugin = new LoggerPlugin();
engine.pluginManager.register(loggerPlugin);
engine.pluginManager.install('logger', engine);
```

## Adding Serializable Systems

### Pattern: System with Save/Load Support

```typescript
// plugins/QuestPlugin.ts
import type { IEnginePlugin, IEngineHost, ISerializable } from '@engine/types';

interface Quest {
  id: string;
  status: 'inactive' | 'active' | 'completed';
  objectives: string[];
}

class QuestTracker implements ISerializable {
  private quests = new Map<string, Quest>();

  addQuest(quest: Quest): void {
    this.quests.set(quest.id, quest);
  }

  startQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (quest) {
      quest.status = 'active';
    }
  }

  completeQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (quest) {
      quest.status = 'completed';
    }
  }

  // Required by ISerializable
  serialize(): any {
    return {
      quests: Array.from(this.quests.entries())
    };
  }

  // Required by ISerializable
  deserialize(data: any): void {
    this.quests = new Map(data.quests || []);
  }
}

export class QuestPlugin implements IEnginePlugin {
  name = 'quest';
  version = '1.0.0';

  private tracker: QuestTracker;

  constructor() {
    this.tracker = new QuestTracker();
  }

  install(engine: IEngineHost): void {
    // Register as a serializable system (for save/load)
    engine.registerSerializableSystem('quests', this.tracker);

    // Access the tracker through engine.context in your game
    // (You can expose methods through your game-specific context extension)
  }

  uninstall(engine: IEngineHost): void {
    engine.unregisterSerializableSystem('quests');
  }

  // Expose tracker for game code
  getTracker(): QuestTracker {
    return this.tracker;
  }
}
```

## Real-World Plugin Examples

### Example 1: Game Clock Plugin (Actual Implementation)

```typescript
// plugins/GameClockPlugin.ts
import type { IEnginePlugin, IEngineHost, ISerializable } from '@engine/types';

export interface ClockConfig {
  unitsPerDay: number;
  initialDay?: number;
  initialUnit?: number;
}

export class GameClockPlugin implements IEnginePlugin, ISerializable {
  name = 'clock';
  version = '1.0.0';

  private absoluteTime: number;
  private unitsPerDay: number;
  private eventBus: EventBus | undefined;

  constructor(config: ClockConfig) {
    this.unitsPerDay = config.unitsPerDay;
    this.absoluteTime = (config.initialDay || 0) * this.unitsPerDay + (config.initialUnit || 0);
  }

  install(engine: IEngineHost): void {
    this.eventBus = engine.eventBus;
    // Register self as serializable system
    engine.registerSerializableSystem('clock', this);
  }

  uninstall(engine: IEngineHost): void {
    engine.unregisterSerializableSystem('clock');
  }

  advance(units: number): void {
    const oldDay = this.getCurrentDay();
    this.absoluteTime += units;
    const newDay = this.getCurrentDay();

    if (newDay !== oldDay) {
      this.eventBus?.emit('clock.dayChanged', {
        day: newDay,
        previousDay: oldDay
      });
    }

    this.eventBus?.emit('clock.advanced', {
      units,
      currentUnit: this.getCurrentUnit(),
      currentDay: newDay
    });
  }

  getCurrentDay(): number {
    return Math.floor(this.absoluteTime / this.unitsPerDay);
  }

  getCurrentUnit(): number {
    return this.absoluteTime % this.unitsPerDay;
  }

  serialize(): any {
    return {
      absoluteTime: this.absoluteTime,
      unitsPerDay: this.unitsPerDay
    };
  }

  deserialize(data: any): void {
    this.absoluteTime = data.absoluteTime || 0;
    this.unitsPerDay = data.unitsPerDay || 24;
  }
}

// Usage
const clock = new GameClockPlugin({ unitsPerDay: 24 });
engine.pluginManager.register(clock);
engine.pluginManager.install('clock', engine);

// In your game code
clock.advance(1); // Advance time by 1 unit
```

### Example 2: Inventory Plugin

```typescript
// plugins/InventoryPlugin.ts
import type { IEnginePlugin, IEngineHost, ISerializable } from '@engine/types';

interface InventoryConfig {
  maxSlots?: number;
}

class InventoryTracker implements ISerializable {
  private items: Map<string, number> = new Map();
  private maxSlots: number;

  constructor(config: InventoryConfig = {}) {
    this.maxSlots = config.maxSlots || 50;
  }

  addItem(itemId: string, quantity: number = 1): boolean {
    const currentQuantity = this.items.get(itemId) || 0;
    const newQuantity = currentQuantity + quantity;

    if (this.items.size >= this.maxSlots && !this.items.has(itemId)) {
      return false; // Inventory full
    }

    this.items.set(itemId, newQuantity);
    return true;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const currentQuantity = this.items.get(itemId) || 0;
    if (currentQuantity < quantity) {
      return false; // Not enough items
    }

    const newQuantity = currentQuantity - quantity;
    if (newQuantity === 0) {
      this.items.delete(itemId);
    } else {
      this.items.set(itemId, newQuantity);
    }
    return true;
  }

  getQuantity(itemId: string): number {
    return this.items.get(itemId) || 0;
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getQuantity(itemId) >= quantity;
  }

  serialize(): any {
    return {
      items: Array.from(this.items.entries()),
      maxSlots: this.maxSlots
    };
  }

  deserialize(data: any): void {
    this.items = new Map(data.items || []);
    this.maxSlots = data.maxSlots || 50;
  }
}

export class InventoryPlugin implements IEnginePlugin {
  name = 'inventory';
  version = '1.0.0';

  private tracker: InventoryTracker;
  private eventBus: EventBus | undefined;

  constructor(config: InventoryConfig = {}) {
    this.tracker = new InventoryTracker(config);
  }

  install(engine: IEngineHost): void {
    this.eventBus = engine.eventBus;
    engine.registerSerializableSystem('inventory', this.tracker);
  }

  uninstall(engine: IEngineHost): void {
    engine.unregisterSerializableSystem('inventory');
  }

  addItem(itemId: string, quantity: number = 1): boolean {
    const success = this.tracker.addItem(itemId, quantity);
    if (success) {
      this.eventBus?.emit('inventory.item.added', {
        itemId,
        quantityAdded: quantity,
        newTotal: this.tracker.getQuantity(itemId)
      });
    } else {
      this.eventBus?.emit('inventory.add.failed.full', {
        itemId,
        quantityAttempted: quantity
      });
    }
    return success;
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    const success = this.tracker.removeItem(itemId, quantity);
    if (success) {
      this.eventBus?.emit('inventory.item.removed', {
        itemId,
        quantityRemoved: quantity,
        newTotal: this.tracker.getQuantity(itemId)
      });
    }
    return success;
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.tracker.hasItem(itemId, quantity);
  }

  getQuantity(itemId: string): number {
    return this.tracker.getQuantity(itemId);
  }
}
```

## Plugin Best Practices

### 1. Implement IEnginePlugin Correctly

```typescript
// Good - implements interface properly
class MyPlugin implements IEnginePlugin {
  name = 'my-plugin';
  version = '1.0.0';

  install(engine: IEngineHost): void {
    // Setup
  }

  uninstall(engine: IEngineHost): void {
    // Cleanup
  }
}

// Bad - wrong signature
class BadPlugin {
  name = 'bad-plugin';

  install(context: GameContext): void {  // WRONG - takes GameContext
    // This will fail
  }
}
```

### 2. Use registerSerializableSystem for State

```typescript
class MyPlugin implements IEnginePlugin, ISerializable {
  name = 'my-plugin';

  install(engine: IEngineHost): void {
    // Register yourself if you have state to save
    engine.registerSerializableSystem('myPlugin', this);
  }

  uninstall(engine: IEngineHost): void {
    // Always unregister in uninstall
    engine.unregisterSerializableSystem('myPlugin');
  }

  serialize(): any {
    return { /* your state */ };
  }

  deserialize(data: any): void {
    // restore state
  }
}
```

### 3. Clean Event Listeners

```typescript
class CleanPlugin implements IEnginePlugin {
  name = 'clean-plugin';
  private handlers: Map<string, Function> = new Map();

  install(engine: IEngineHost): void {
    const handler = (data: any) => {
      // Handle event
    };

    engine.eventBus.on('some.event', handler);
    this.handlers.set('some.event', handler);
  }

  uninstall(engine: IEngineHost): void {
    // Remove all listeners
    this.handlers.forEach((handler, event) => {
      engine.eventBus.off(event, handler);
    });
    this.handlers.clear();
  }
}
```

### 4. Make It Configurable

```typescript
interface MyPluginConfig {
  enabled?: boolean;
  maxValue?: number;
}

class ConfigurablePlugin implements IEnginePlugin {
  name = 'configurable';
  private config: MyPluginConfig;

  constructor(config: MyPluginConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      maxValue: config.maxValue ?? 100
    };
  }

  install(engine: IEngineHost): void {
    if (!this.config.enabled) {
      console.log('Plugin disabled by config');
      return;
    }
    // Use this.config.maxValue, etc.
  }
}

// Usage
const plugin = new ConfigurablePlugin({ maxValue: 200 });
```

### 5. Access Engine Context Properly

```typescript
class ContextAwarePlugin implements IEnginePlugin {
  name = 'context-aware';

  install(engine: IEngineHost): void {
    // Access game state through engine.context
    const currentScene = engine.context.currentScene;
    const flags = engine.context.flags;

    // Listen to events
    engine.eventBus.on('scene.changed', (data) => {
      // React to scene changes
    });
  }
}
```

## Testing Plugins

### Unit Test Example

```typescript
// __tests__/QuestPlugin.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@engine/core/EventBus';
import { QuestPlugin } from '../plugins/QuestPlugin';
import type { IEngineHost } from '@engine/types';

describe('QuestPlugin', () => {
  let plugin: QuestPlugin;
  let mockEngine: IEngineHost;

  beforeEach(() => {
    mockEngine = {
      context: {} as any,
      eventBus: new EventBus(),
      registerSerializableSystem: vi.fn(),
      unregisterSerializableSystem: vi.fn()
    };

    plugin = new QuestPlugin();
  });

  it('should register serializable system on install', () => {
    plugin.install(mockEngine);

    expect(mockEngine.registerSerializableSystem).toHaveBeenCalledWith(
      'quests',
      expect.anything()
    );
  });

  it('should unregister on uninstall', () => {
    plugin.install(mockEngine);
    plugin.uninstall(mockEngine);

    expect(mockEngine.unregisterSerializableSystem).toHaveBeenCalledWith('quests');
  });

  it('should track quest state', () => {
    plugin.install(mockEngine);
    const tracker = plugin.getTracker();

    tracker.addQuest({ id: 'quest1', status: 'inactive', objectives: [] });
    tracker.startQuest('quest1');

    const data = tracker.serialize();
    expect(data.quests).toHaveLength(1);
    expect(data.quests[0][1].status).toBe('active');
  });
});
```

## Migration from Old Pattern

### Old Pattern (DELETED - DO NOT USE)

```typescript
// WRONG - This no longer works
const plugin: GamePlugin = {
  name: 'MyPlugin',
  install: (context: GameContext) => {
    const mySystem = new MySystem();
    context.registry.register(SYSTEM_KEY, mySystem);  // registry deleted
  }
};
```

### New Pattern (Current)

```typescript
// CORRECT - Use this
class MyPlugin implements IEnginePlugin {
  name = 'MyPlugin';

  install(engine: IEngineHost): void {
    const mySystem = new MySystem();
    engine.registerSerializableSystem('mySystem', mySystem);
  }

  uninstall(engine: IEngineHost): void {
    engine.unregisterSerializableSystem('mySystem');
  }
}
```

## Next Steps

- Review [existing plugins](../../engine/plugins/) for more examples
- See [IEnginePlugin interface](../../engine/types/IPlugin.ts) for full API
- Check [testing guide](./testing-strategy.md) for plugin testing patterns
- Explore [event reference](./events.md) for all engine events