# DOM Dependency Audit Report

> **Date**: 2025-11-09
> **Goal**: Identify ALL platform-specific dependencies in engine core
> **Philosophy**: Engine core must be 100% platform-agnostic

---

## Executive Summary

### Current State: 🟡 **Partially Abstracted**

**Good News**:
- ✅ `InputManager` is already platform-agnostic (processes engine events, not DOM events)
- ✅ `DomInputAdapter` pattern exists (translates platform events to engine events)
- ✅ `PlatformContainer` abstraction exists
- ✅ `IRenderer` interface exists

**Problems**:
- ❌ Interfaces still hardcode `HTMLElement` types
- ❌ `window.AudioContext` directly accessed in SystemDefinitions
- ❌ Renderer initialization tightly coupled to DOM
- ❌ No abstraction for audio platform layer
- ❌ No abstraction for storage platform layer (LocalStorage assumed)

---

## DOM Dependencies by Category

### 🔴 CRITICAL: Core Engine Coupling

#### 1. **IRenderer Interface** (engine/types/RenderingTypes.ts:4)
```typescript
// ❌ PROBLEM: Hardcodes HTMLElement
interface IRenderer {
    init(container: HTMLElement): void;  // <-- DOM-specific!
}
```

**Impact**: Every renderer must accept HTML

Element, preventing non-DOM renderers

**Solution**:
```typescript
interface IRenderer<TContainer = unknown> {
    init(container: TContainer): void;
}

// Or:
interface IRenderer {
    init(container: IRenderContainer): void;
}
```

---

#### 2. **RenderManager Constructor** (engine/core/RenderManager.ts:15)
```typescript
// ❌ PROBLEM: Takes HTMLElement directly
constructor(
    config: { type: 'dom' | 'canvas' | 'svelte' },
    eventBus: EventBus,
    container: HTMLElement,  // <-- Hardcoded DOM!
    registry: SystemRegistry
)
```

**Impact**: RenderManager cannot work without DOM

**Solution**: Accept `PlatformContainer` instead:
```typescript
constructor(
    config: { type: 'dom' | 'canvas' | 'svelte' },
    eventBus: EventBus,
    container: PlatformContainer,  // <-- Abstract!
    registry: SystemRegistry
)
```

---

#### 3. **SystemDefinitions - Web Audio API** (engine/core/SystemDefinitions.ts:90, 131)
```typescript
// ❌ PROBLEM: Direct window.AudioContext access
try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
} catch (e) {
    console.warn('[SystemDefinitions] Web Audio API not supported.');
}
```

**Impact**: Cannot run without browser globals

**Solution**: Audio platform adapter
```typescript
interface IAudioPlatform {
    createContext(): AudioContext | null;
    isSupported(): boolean;
}

class WebAudioPlatform implements IAudioPlatform {
    createContext(): AudioContext | null {
        try {
            return new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch {
            return null;
        }
    }
}
```

---

#### 4. **EffectManager** (engine/systems/EffectManager.ts)
```typescript
// Directly takes HTMLElement
constructor(private container: HTMLElement)
```

**Impact**: Effects are DOM-only

**Solution**: Use platform adapter for effects or make effects renderer-specific

---

### 🟡 MEDIUM: Platform-Specific Adapters (Good Pattern, Needs Consistency)

#### 5. **DomInputAdapter** ✅ (engine/core/DomInputAdapter.ts)
**Status**: GOOD - This is the RIGHT pattern!

```typescript
export class DomInputAdapter {
    attachToContainer(container: PlatformContainer): boolean {
        const element = container.getDomElement?.();
        if (!element) return false;
        // Translate DOM events to engine events
    }
}
```

**Why it's good**:
- Platform-specific logic is isolated
- Works with PlatformContainer abstraction
- InputManager remains platform-agnostic

**Need more like this for**:
- Canvas input
- Gamepad input
- Touch input (mobile)

---

#### 6. **Storage Adapters** ✅ (engine/systems/LocalStorageAdapter.ts)
**Status**: GOOD pattern, needs more implementations

**Current**:
- `LocalStorageAdapter` - Uses browser localStorage
- `BackendAdapter` - Uses server API

**Missing**:
- `IndexedDBAdapter` - Browser persistent storage
- `FileSystemAdapter` - Node.js/Electron
- `InMemoryAdapter` - Testing

---

### 🟢 LOW: Renderer Implementations (Expected to be platform-specific)

#### 7. **DomRenderer** (engine/rendering/DomRenderer.ts)
**Status**: ACCEPTABLE - Renderers SHOULD be platform-specific

- `DomRenderer` uses DOM
- `CanvasRenderer` uses Canvas API
- Future: `WebGLRenderer`, `SVGRenderer`, etc.

**These are fine** as long as:
- They implement `IRenderer` interface
- Engine core doesn't depend on specific renderer
- Renderer selection is injected via DI

---

## Dependency Map

### Files with `document.*` usage:
```
engine/rendering/DomRenderer.ts          ✅ OK (renderer implementation)
engine/rendering/CanvasRenderer.ts       ✅ OK (renderer implementation)
engine/core/SystemDefinitions.ts         ❌ PROBLEM (core system)
engine/systems/EffectManager.ts          ❌ PROBLEM (core system)
engine/tests/*                           ✅ OK (tests need DOM)
```

### Files with `window.*` usage:
```
engine/core/SystemDefinitions.ts         ❌ PROBLEM (window.AudioContext)
engine/audio/MusicPlayer.ts              🟡 CHECK (may need audio adapter)
engine/systems/InputManager.ts           ✅ OK (only for gamepad polling)
```

### Files with `HTMLElement` types:
```
engine/types/RenderingTypes.ts           ❌ PROBLEM (IRenderer.init)
engine/types/EngineEventMap.ts           🟡 CHECK
engine/core/RenderManager.ts             ❌ PROBLEM (constructor)
engine/core/PlatformContainer.ts         ✅ OK (abstraction layer)
engine/core/DomInputAdapter.ts           ✅ OK (adapter implementation)
engine/systems/EffectManager.ts          ❌ PROBLEM
engine/systems/InputManager.ts           ✅ OK (accepts engine events)
engine/rendering/*                       ✅ OK (renderer implementations)
```

### Files with `addEventListener`:
```
engine/core/DomInputAdapter.ts           ✅ OK (adapter pattern)
engine/tests/*                           ✅ OK (tests)
```

### Files with `localStorage`:
```
engine/systems/LocalStorageAdapter.ts    ✅ OK (adapter pattern)
engine/tests/LocalStorageAdapter.test.ts ✅ OK (tests)
```

---

## Architecture Assessment

### ✅ What's Already Good

1. **Input Abstraction** - Already implemented correctly!
   - `InputManager` processes engine events only
   - `DomInputAdapter` translates DOM → engine events
   - Clean separation

2. **Storage Abstraction** - Pattern exists
   - `IStorageAdapter` interface
   - Multiple implementations
   - Injected via DI

3. **Platform Container** - Partially there
   - `PlatformContainer` interface exists
   - `BrowserContainer`, `HeadlessContainer` implementations
   - Just needs to be used consistently

### ❌ What Needs Fixing

1. **Renderer Initialization**
   - `IRenderer.init()` must not require `HTMLElement`
   - Should accept generic container or IRenderContainer

2. **Audio Platform Layer**
   - No abstraction for audio context creation
   - Hardcoded `window.AudioContext`
   - Need `IAudioPlatform` adapter

3. **Effect System**
   - EffectManager is DOM-only
   - Should be renderer-specific or have platform adapter

4. **System Definitions**
   - Still has direct `window` access
   - Should receive platform adapters via DI

---

## Proposed Architecture

### Core Principles

1. **Engine Core = Platform Agnostic**
   - ZERO `document.*` usage
   - ZERO `window.*` usage
   - ZERO `HTMLElement` types
   - Works in Node.js, browser, mobile, anywhere

2. **Platform Layer = Adapters**
   - `BrowserPlatform` - Browser-specific implementations
   - `NodePlatform` - Node.js/Electron
   - `MobilePlatform` - React Native, Capacitor
   - `TestPlatform` - Mocks for testing

3. **DI All The Things**
   - Engine receives `IPlatformAdapter` in constructor
   - Renderer receives `IRenderContainer`
   - Audio receives `IAudioPlatform`
   - No global access anywhere

---

## Required Interfaces

### 1. **IRenderContainer**
```typescript
interface IRenderContainer {
    getType(): 'dom' | 'canvas' | 'native' | 'headless';
    getNativeContainer(): unknown;  // Platform-specific
    getDimensions(): { width: number; height: number };
}
```

### 2. **IAudioPlatform**
```typescript
interface IAudioPlatform {
    createContext(): AudioContext | null;
    isSupported(): boolean;
    getType(): 'webaudio' | 'native' | 'mock';
}
```

### 3. **IPlatformAdapter** (Master Platform Interface)
```typescript
interface IPlatformAdapter {
    readonly type: 'browser' | 'node' | 'mobile' | 'test';

    // Rendering
    getRenderContainer?(): IRenderContainer;

    // Audio
    getAudioPlatform?(): IAudioPlatform;

    // Storage
    getStorageAdapter(): IStorageAdapter;

    // Input (already have pattern)
    createInputAdapter?(): IInputAdapter;
}
```

### 4. **IInputAdapter** (Formalize existing pattern)
```typescript
interface IInputAdapter {
    attach(container: IRenderContainer): boolean;
    detach(): void;
    onEvent(handler: (event: EngineInputEvent) => void): void;
}
```

---

## Migration Strategy

### Phase 1: Interface Updates
1. Update `IRenderer` to accept `IRenderContainer`
2. Create `IAudioPlatform` interface
3. Create master `IPlatformAdapter` interface
4. Update `RenderManager` constructor

### Phase 2: Implementation
1. Create `BrowserPlatformAdapter` (browser globals)
2. Create `HeadlessPlatformAdapter` (testing/Node.js)
3. Update `SystemDefinitions` to use `IPlatformAdapter`
4. Update all system factories to inject platform deps

### Phase 3: Refactor
1. Remove all `window.*` from engine core
2. Remove all `HTMLElement` from engine core interfaces
3. Move EffectManager to renderer-specific or platform adapter
4. Update all tests to use mock platform

### Phase 4: Validation
1. Run engine in Node.js (headless)
2. Run engine in browser (DOM)
3. Run engine with Canvas renderer
4. Run all tests with mock platform

---

## Success Criteria

- [ ] Engine core builds without DOM types (`lib.dom.d.ts` not required)
- [ ] Engine can run in Node.js environment
- [ ] All tests pass with mock platform adapters
- [ ] Zero `document.*` or `window.*` in `engine/core/**` or `engine/systems/**`
- [ ] Renderer implementations can be selected at runtime
- [ ] Audio platform can be swapped (Web Audio, mock, etc.)
- [ ] Storage platform can be swapped (localStorage, IndexedDB, filesystem)

---

## Files Requiring Changes

### Critical (Must Fix)
1. `engine/types/RenderingTypes.ts` - Update IRenderer interface
2. `engine/core/RenderManager.ts` - Accept platform container
3. `engine/core/SystemDefinitions.ts` - Remove window access, use platform adapter
4. `engine/systems/EffectManager.ts` - Platform-agnostic or renderer-specific

### Medium (Should Fix)
5. `engine/audio/MusicPlayer.ts` - Use audio platform adapter
6. `engine/core/PlatformContainer.ts` - Enhance to full platform adapter
7. `engine/types/EngineEventMap.ts` - Remove HTMLElement if present

### Low (Nice to Have)
8. Create `engine/interfaces/` directory for all platform interfaces
9. Create `engine/platform/` directory for platform implementations
10. Documentation for creating custom platform adapters

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Interface Design | 4 hours | Low |
| Phase 2: Platform Adapters | 8 hours | Medium |
| Phase 3: Refactoring | 12 hours | High (many changes) |
| Phase 4: Testing & Validation | 6 hours | Medium |
| **Total** | **~30 hours** | **Medium** |

---

## Next Steps

1. ✅ Complete this audit
2. ⏭️ Design `IPlatformAdapter` and related interfaces
3. ⏭️ Implement `BrowserPlatformAdapter`
4. ⏭️ Update `SystemDefinitions` to use adapters
5. ⏭️ Refactor `IRenderer` and `RenderManager`
6. ⏭️ Run validation tests
7. ⏭️ Update documentation

---

## Conclusion

**The good news**: We're ~60% there. The adapter pattern is already established for input and storage. We just need to:
1. Apply it consistently across audio and rendering
2. Remove hardcoded platform access from core systems
3. Formalize platform abstraction into a cohesive `IPlatformAdapter`

**The architecture is sound** - we just need to finish the decoupling process.

**ZERO hardcoding. FULL DI. Games decide everything.** 🎯
