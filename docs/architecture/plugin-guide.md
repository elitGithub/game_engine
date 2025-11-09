# Plugin Development Guide

> Learn how to extend the game engine without modifying core code

## What Are Plugins?

Plugins are self-contained modules that extend the engine's functionality. They can:
- Add new systems (managers, trackers, utilities)
- Listen to engine events
- Extend the game context
- Register custom renderers or effects
- Provide reusable game features (combat, quests, inventory, etc.)

## Plugin Architecture

### Basic Structure

```typescript
interface GamePlugin {
  name: string;
  install: (context: GameContext) => void | Promise<void>;
}
```

Every plugin has:
1. **Name**: Unique identifier
2. **Install function**: Called during engine initialization with full access to game context

### Plugin Lifecycle

```
Engine.init() →
  PluginManager.installAll() →
    For each plugin:
      1. Call plugin.install(context)
      2. Plugin adds systems, listeners, etc.
      3. Plugin completes
  All plugins installed →
  Engine ready
```

## Creating Your First Plugin

### Example: Simple Logger Plugin

```typescript
// plugins/LoggerPlugin.ts
import type { GamePlugin, GameContext } from '../engine/types';

export const LoggerPlugin: GamePlugin = {
  name: 'LoggerPlugin',

  install: (context: GameContext) => {
    // Listen to engine events
    context.eventBus.on('scene:loaded', (scene) => {
      console.log(`Scene loaded: ${scene.name}`);
    });

    context.eventBus.on('action:executed', (action) => {
      console.log(`Action executed: ${action.type}`);
    });
  }
};

// Usage in your game
engine.plugin(LoggerPlugin);
```

## Adding Custom Systems

### Pattern: System with Dependencies

```typescript
// 1. Define your system class
class QuestManager {
  private quests = new Map<string, Quest>();

  constructor(
    private eventBus: EventBus,
    private flags: FlagTracker
  ) {}

  startQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error(`Quest not found: ${questId}`);

    quest.status = 'active';
    this.flags.set(`quest_${questId}_active`, true);
    this.eventBus.emit('quest:started', { questId });
  }

  completeQuest(questId: string): void {
    this.flags.set(`quest_${questId}_completed`, true);
    this.eventBus.emit('quest:completed', { questId });
  }

  isQuestComplete(questId: string): boolean {
    return this.flags.get(`quest_${questId}_completed`);
  }
}

// 2. Create a system key
import { createSystemKey } from '../engine/core/SystemRegistry';
export const QUEST_MANAGER = createSystemKey('QUEST_MANAGER');

// 3. Create the plugin
export const QuestPlugin: GamePlugin = {
  name: 'QuestPlugin',

  install: (context: GameContext) => {
    const questManager = new QuestManager(
      context.eventBus,
      context.flags
    );

    context.registry.register(QUEST_MANAGER, questManager);
  }
};

// 4. Use in your game
engine.plugin(QuestPlugin);

// 5. Access your system
const questManager = context.registry.get(QUEST_MANAGER);
questManager.startQuest('main_quest_1');
```

### Pattern: Lazy-Loaded System

```typescript
export const HeavyFeaturePlugin: GamePlugin = {
  name: 'HeavyFeaturePlugin',

  install: (context: GameContext) => {
    let instance: HeavyFeature | null = null;

    const getHeavyFeature = () => {
      if (!instance) {
        instance = new HeavyFeature(context.eventBus);
        console.log('Heavy feature initialized');
      }
      return instance;
    };

    // Register lazy getter
    context.registry.register(HEAVY_FEATURE, {
      get: () => getHeavyFeature()
    });

    // Or initialize only when specific event occurs
    context.eventBus.once('game:feature-needed', () => {
      getHeavyFeature();
    });
  }
};
```

## Real-World Plugin Examples

### Example 1: Combat System Plugin

```typescript
// plugins/CombatPlugin.ts
interface CombatStats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
}

class CombatManager {
  private combatants = new Map<string, CombatStats>();

  constructor(private eventBus: EventBus) {}

  registerCombatant(id: string, stats: CombatStats): void {
    this.combatants.set(id, { ...stats });
  }

  attack(attackerId: string, targetId: string): number {
    const attacker = this.combatants.get(attackerId);
    const target = this.combatants.get(targetId);

    if (!attacker || !target) {
      throw new Error('Invalid combatant');
    }

    const damage = Math.max(0, attacker.attack - target.defense);
    target.health = Math.max(0, target.health - damage);

    this.eventBus.emit('combat:damage', {
      attackerId,
      targetId,
      damage,
      remaining: target.health
    });

    if (target.health === 0) {
      this.eventBus.emit('combat:defeated', { targetId });
    }

    return damage;
  }

  heal(targetId: string, amount: number): void {
    const target = this.combatants.get(targetId);
    if (!target) return;

    target.health = Math.min(target.maxHealth, target.health + amount);
    this.eventBus.emit('combat:healed', { targetId, amount });
  }
}

export const COMBAT_MANAGER = createSystemKey('COMBAT_MANAGER');

export const CombatPlugin: GamePlugin = {
  name: 'CombatPlugin',

  install: (context: GameContext) => {
    const combat = new CombatManager(context.eventBus);
    context.registry.register(COMBAT_MANAGER, combat);

    // Optional: Register combat-related actions
    context.registry.get(SYSTEMS.ACTION_REGISTRY).register(
      'attack',
      new AttackAction()
    );
  }
};
```

### Example 2: Achievement System Plugin

```typescript
// plugins/AchievementPlugin.ts
interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (context: GameContext) => boolean;
  unlocked: boolean;
}

class AchievementManager {
  private achievements = new Map<string, Achievement>();

  constructor(
    private eventBus: EventBus,
    private flags: FlagTracker
  ) {
    // Check achievements on any flag change
    this.eventBus.on('flag:changed', () => this.checkAchievements());
  }

  register(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
  }

  private checkAchievements(): void {
    for (const [id, achievement] of this.achievements) {
      if (!achievement.unlocked && achievement.condition(this.context)) {
        this.unlock(id);
      }
    }
  }

  private unlock(id: string): void {
    const achievement = this.achievements.get(id);
    if (!achievement) return;

    achievement.unlocked = true;
    this.flags.set(`achievement_${id}`, true);
    this.eventBus.emit('achievement:unlocked', achievement);
  }

  getProgress(): { total: number; unlocked: number; percentage: number } {
    const total = this.achievements.size;
    const unlocked = Array.from(this.achievements.values())
      .filter(a => a.unlocked).length;

    return {
      total,
      unlocked,
      percentage: total > 0 ? (unlocked / total) * 100 : 0
    };
  }
}

export const ACHIEVEMENT_MANAGER = createSystemKey('ACHIEVEMENT_MANAGER');

export const AchievementPlugin: GamePlugin = {
  name: 'AchievementPlugin',

  install: (context: GameContext) => {
    const manager = new AchievementManager(
      context.eventBus,
      context.flags
    );

    context.registry.register(ACHIEVEMENT_MANAGER, manager);

    // Show notification on unlock
    context.eventBus.on('achievement:unlocked', (achievement) => {
      console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
      // Could trigger UI notification here
    });
  }
};
```

### Example 3: Day/Night Cycle Plugin

```typescript
// plugins/DayNightPlugin.ts
type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

class DayNightManager {
  private currentTime: number = 0; // 0-23 hours

  constructor(private eventBus: EventBus) {}

  advance(hours: number): void {
    const oldTime = this.getTimeOfDay();
    this.currentTime = (this.currentTime + hours) % 24;
    const newTime = this.getTimeOfDay();

    this.eventBus.emit('time:advanced', {
      hours,
      currentHour: this.currentTime
    });

    if (oldTime !== newTime) {
      this.eventBus.emit('timeofday:changed', {
        from: oldTime,
        to: newTime
      });
    }
  }

  getTimeOfDay(): TimeOfDay {
    if (this.currentTime >= 6 && this.currentTime < 9) return 'dawn';
    if (this.currentTime >= 9 && this.currentTime < 18) return 'day';
    if (this.currentTime >= 18 && this.currentTime < 21) return 'dusk';
    return 'night';
  }

  getCurrentHour(): number {
    return this.currentTime;
  }
}

export const DAY_NIGHT_MANAGER = createSystemKey('DAY_NIGHT_MANAGER');

export const DayNightPlugin: GamePlugin = {
  name: 'DayNightPlugin',

  install: (context: GameContext) => {
    const manager = new DayNightManager(context.eventBus);
    context.registry.register(DAY_NIGHT_MANAGER, manager);

    // Apply visual effects based on time of day
    context.eventBus.on('timeofday:changed', ({ to }) => {
      const effectManager = context.registry.get(SYSTEMS.EFFECT_MANAGER);

      // Remove old effects
      effectManager.remove(document.body, 'dawn-filter');
      effectManager.remove(document.body, 'dusk-filter');
      effectManager.remove(document.body, 'night-filter');

      // Apply new effect
      if (to === 'dawn') {
        effectManager.apply(document.body, 'dawn-filter');
      } else if (to === 'dusk') {
        effectManager.apply(document.body, 'dusk-filter');
      } else if (to === 'night') {
        effectManager.apply(document.body, 'night-filter');
      }
    });
  }
};
```

## Plugin Best Practices

### 1. Single Responsibility

Each plugin should do ONE thing well:

```typescript
// ✅ Good - focused plugin
const SaveGamePlugin: GamePlugin = {
  name: 'SaveGamePlugin',
  install: (context) => {
    // Only handles save/load functionality
  }
};

// ❌ Bad - does too much
const MegaPlugin: GamePlugin = {
  name: 'MegaPlugin',
  install: (context) => {
    // Adds combat, quests, achievements, shop, crafting...
  }
};
```

### 2. Declare Dependencies Clearly

```typescript
const MyPlugin: GamePlugin = {
  name: 'MyPlugin',
  install: (context) => {
    // Check for required systems
    if (!context.registry.has(SYSTEMS.AUDIO_MANAGER)) {
      throw new Error('MyPlugin requires AudioManager');
    }

    const audio = context.registry.get(SYSTEMS.AUDIO_MANAGER);
    // Use audio...
  }
};
```

### 3. Clean Up After Yourself

```typescript
const CleanPlugin: GamePlugin = {
  name: 'CleanPlugin',
  install: (context) => {
    const handler = (data: any) => {
      // Handle event
    };

    context.eventBus.on('some:event', handler);

    // Provide cleanup method
    context.eventBus.on('engine:shutdown', () => {
      context.eventBus.off('some:event', handler);
    });
  }
};
```

### 4. Make It Configurable

```typescript
interface QuestPluginConfig {
  autoSave?: boolean;
  maxQuests?: number;
}

const createQuestPlugin = (config: QuestPluginConfig = {}): GamePlugin => ({
  name: 'QuestPlugin',
  install: (context) => {
    const manager = new QuestManager({
      autoSave: config.autoSave ?? true,
      maxQuests: config.maxQuests ?? 50
    });

    context.registry.register(QUEST_MANAGER, manager);
  }
});

// Usage
engine.plugin(createQuestPlugin({ autoSave: false, maxQuests: 100 }));
```

### 5. Type Safety

```typescript
// Export types for plugin users
export interface QuestManager {
  startQuest(id: string): void;
  completeQuest(id: string): void;
  isQuestActive(id: string): boolean;
}

// Type-safe registry access
declare module '../engine/types' {
  interface SystemRegistry {
    get(key: typeof QUEST_MANAGER): QuestManager;
  }
}
```

## Testing Plugins

### Unit Test Example

```typescript
// __tests__/QuestPlugin.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../engine/core/EventBus';
import { FlagTracker } from '../engine/utilities/FlagTracker';
import { QuestPlugin, QUEST_MANAGER } from '../plugins/QuestPlugin';

describe('QuestPlugin', () => {
  let context: GameContext;

  beforeEach(() => {
    context = {
      eventBus: new EventBus(),
      flags: new FlagTracker(),
      registry: new SystemRegistry()
    };

    QuestPlugin.install(context);
  });

  it('should register quest manager', () => {
    expect(context.registry.has(QUEST_MANAGER)).toBe(true);
  });

  it('should start quest and emit event', () => {
    const questManager = context.registry.get(QUEST_MANAGER);
    let eventEmitted = false;

    context.eventBus.on('quest:started', () => {
      eventEmitted = true;
    });

    questManager.startQuest('test_quest');
    expect(eventEmitted).toBe(true);
    expect(context.flags.get('quest_test_quest_active')).toBe(true);
  });
});
```

## Plugin Distribution

### Sharing Plugins

```typescript
// package.json for standalone plugin
{
  "name": "@mygame/quest-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "game-engine": "^2.0.0"
  }
}

// index.ts
export { QuestPlugin, QUEST_MANAGER } from './QuestPlugin';
export type { QuestManager, Quest } from './types';
```

### Using External Plugins

```typescript
// Install
npm install @mygame/quest-plugin

// Use
import { QuestPlugin } from '@mygame/quest-plugin';

engine.plugin(QuestPlugin);
```

## Next Steps

- Review [existing plugins](../../engine/plugins/) for more examples
- Check [plugin API reference](./plugin-api.md) for all available hooks
- See [testing guide](./testing-strategy.md) for plugin testing patterns
- Explore [event reference](./events.md) for all engine events
