# Fix Plan - Game Engine Code Review

**Date:** 2025-01-14
**Status:** IN PROGRESS - 41/50 Issues Completed (82%)
**Corrections Applied:** False positives removed based on technical review

## Implementation Status

**Completed:**
- ✅ PHASE 1: All 6 CRITICAL issues (100%)
- ✅ PHASE 2: All 14 HIGH priority issues (100%)
- ✅ PHASE 3: 21/22 MEDIUM priority issues (95%)

**Remaining:**
- ⏳ Issue 42: TSDoc documentation (1 MEDIUM issue)
- ⏳ PHASE 4: 8 LOW priority issues (documentation, polish)

**Branch:** `claude/follow-fix-plan-013Vav7eYC8yXj4w6ASREp9v`
**Commits Pushed:** 6 commits
**Tests:** All 408 tests passing ✅
**Type Check:** No errors ✅

---

## Issue Summary (Corrected)

**Total Valid Issues:** 50 (down from 56)
- **CRITICAL:** 6 issues (production-breaking)
- **HIGH:** 14 issues (memory leaks, type safety)
- **MEDIUM:** 22 issues (code quality, performance)
- **LOW:** 8 issues (polish)

**Removed as False Positives:**
- ~~Non-null assertion in DomRenderer~~ (safe due to line 51 check)
- ~~Canvas/DOM parity issue~~ (TextStyleData only has 6 properties, both implement all)
- ~~Style diffing "bug"~~ (deliberate, documented performance decision)
- ~~ImageLoader/JsonLoader readonly~~ (already correct)

---

## PHASE 1: CRITICAL FIXES (Must Do)

**Estimated Time:** 2-3 hours
**Impact:** Production bugs, architecture violations

### 1. Refactor stopMusic() to Return Real Promise

**File:** `engine/audio/MusicPlayer.ts:96-119`
**Problem:** stopMusic is "fake async" - doesn't await setTimeout, returns immediately
**Impact:** Breaks crossfadeMusic functionality

```typescript
// BEFORE (fake async):
async stopMusic(fadeOutDuration: number = 0): Promise<void> {
    if (!this.currentMusic) return;

    if (this.currentMusic.fadeOutTimer) {
        this.timer.clearTimeout(this.currentMusic.fadeOutTimer);
    }

    if (fadeOutDuration > 0) {
        this.currentMusic.fadeOutTimer = this.timer.setTimeout(() => {
            this.stopMusicImmediately();
        }, fadeOutDuration * 1000);
    } else {
        this.stopMusicImmediately();
    }
}

// AFTER (real async):
async stopMusic(fadeOutDuration: number = 0): Promise<void> {
    if (!this.currentMusic) return;

    if (this.currentMusic.fadeOutTimer) {
        this.timer.clearTimeout(this.currentMusic.fadeOutTimer);
        this.currentMusic.fadeOutTimer = undefined;
    }

    if (fadeOutDuration > 0) {
        return new Promise<void>((resolve) => {
            this.currentMusic!.fadeOutTimer = this.timer.setTimeout(() => {
                this.stopMusicImmediately();
                resolve();
            }, fadeOutDuration * 1000);
        });
    } else {
        this.stopMusicImmediately();
    }
}
```

**Then update callers:**

```typescript
// playMusic line 47:
if (this.currentMusic) {
    await this.stopMusic(0);
}

// crossfadeMusic line 155:
await this.stopMusic(duration);
await this.playMusic(newTrackId, true, duration);
```

---

### 2. Add onEnded Cleanup for Non-Looping Music

**File:** `engine/audio/MusicPlayer.ts:76` (after source setup)
**Problem:** Memory leak - non-looping tracks never clean up

```typescript
// Add after line 75 in playMusic():
if (!loop) {
    source.onEnded(() => {
        // Ensure this callback isn't for a track that was already stopped
        if (this.currentMusic && this.currentMusic.source === source) {
            this.currentMusic.gainNode.disconnect();
            this.currentMusic.source = null;
            this.currentMusic = null;
            this.musicState = 'stopped';
            this.eventBus.emit('music.stopped', {});
        }
    });
}
```

---

### 3. Remove Platform Coupling - DOM EventTarget in Core

**File:** `engine/types/InputEvents.ts:76`
**Problem:** ClickEvent uses DOM-specific EventTarget type

```typescript
// BEFORE:
export interface ClickEvent extends BaseInputEvent {
    type: 'click';
    x: number;
    y: number;
    target: EventTarget | null;  // DOM-specific!
    data?: Record<string, unknown>;
}

// AFTER:
export interface ClickEvent extends BaseInputEvent {
    type: 'click';
    x: number;
    y: number;
    target: unknown;  // Platform-agnostic
    data?: Record<string, unknown>;
}
```

---

### 4. Fix Platform Coupling in DomRenderer

**File:** `engine/rendering/DomRenderer.ts`

**Line 4:**
```typescript
// BEFORE:
import type { DomRenderContainer } from "@engine/platform/browser/DomRenderContainer";

// AFTER:
import type { IDomRenderContainer } from "@engine/interfaces";
```

**Line 14:**
```typescript
// BEFORE:
private domContainer: DomRenderContainer | null = null;

// AFTER:
private domContainer: IDomRenderContainer | null = null;
```

---

### 5. Fix Inline Import in Engine.ts

**File:** `engine/Engine.ts`

**Add at top (around line 14):**
```typescript
import type { SerializationRegistry } from '@engine/core/SerializationRegistry';
```

**Lines 290-295:**
```typescript
// BEFORE:
get serializationRegistry(): import('@engine/core/SerializationRegistry').SerializationRegistry {
    if (!this.container.has(CORE_SYSTEMS.SerializationRegistry)) {
        throw new Error('[Engine] SerializationRegistry not registered.');
    }
    return this.container.get<import('@engine/core/SerializationRegistry').SerializationRegistry>(
        CORE_SYSTEMS.SerializationRegistry
    );
}

// AFTER:
get serializationRegistry(): SerializationRegistry {
    if (!this.container.has(CORE_SYSTEMS.SerializationRegistry)) {
        throw new Error('[Engine] SerializationRegistry not registered.');
    }
    return this.container.get<SerializationRegistry>(CORE_SYSTEMS.SerializationRegistry);
}
```

---

### 6. Fix Encapsulation Violation in InputActionMapper

**File:** `engine/input/InputActionMapper.ts:18-21`

```typescript
// BEFORE:
public getActions(): Map<string, InputAction> {
    return this.actions;
}

// AFTER:
public getActions(): ReadonlyMap<string, InputAction> {
    return this.actions;
}
```

**Test Fix Required:**
**File:** `engine/tests/InputActionMapper.test.ts:26`
Remove or refactor test that directly mutates internal state.

---

## PHASE 2: HIGH PRIORITY FIXES (Should Do)

**Estimated Time:** 3-4 hours
**Impact:** Memory leaks, type safety, robustness

### 7. Fix Incomplete Cleanup in VoicePlayer.stopAll()

**File:** `engine/audio/VoicePlayer.ts`
**Problem:** Disconnects sources but not gain nodes

**Refactor to track both:**

```typescript
// Change line 9:
// BEFORE:
private activeVoices: Set<IAudioSource>;

// AFTER:
private activeVoices: Set<{ source: IAudioSource; gain: IAudioGain }>;

// Update playVoice() (around line 30-42):
const voice = this.audioContext.createSource(buffer);
const gainNode = this.audioContext.createGain();
gainNode.setValue(volume);
voice.connect(gainNode);
gainNode.connect(this.outputNode);
voice.start();

const voiceEntry = { source: voice, gain: gainNode };
this.activeVoices.add(voiceEntry);

voice.onEnded(() => {
    voice.disconnect();
    gainNode.disconnect();
    this.activeVoices.delete(voiceEntry);
    this.eventBus.emit('voice.ended', { voiceId });
});

// Update stopAll() (line 53-63):
stopAll(): void {
    this.activeVoices.forEach(({ source, gain }) => {
        source.stop();
        source.disconnect();
        gain.disconnect();
    });
    this.activeVoices.clear();
}
```

---

### 8. Fix Division by Zero in Dialogue.getProgress()

**File:** `engine/rendering/Dialogue.ts:49-52`

```typescript
// BEFORE:
getProgress(): { current: number; total: number; percentage: number } {
    return {
        current: this.currentIndex,
        total: this.lines.length,
        percentage: (this.currentIndex / this.lines.length) * 100
    };
}

// AFTER:
getProgress(): { current: number; total: number; percentage: number } {
    return {
        current: this.currentIndex,
        total: this.lines.length,
        percentage: this.lines.length === 0 ? 0 : (this.currentIndex / this.lines.length) * 100
    };
}
```

---

### 9. Fix Incorrect Return Type in SpeakerRegistry

**File:** `engine/rendering/SpeakerRegistry.ts:24`

```typescript
// BEFORE:
get(speakerId: string): Speaker | null | undefined {
    return this.speakers.get(speakerId);
}

// AFTER:
get(speakerId: string): Speaker | undefined {
    return this.speakers.get(speakerId);
}
```

---

### 10. Remove .ts Extensions from Imports

**File:** `engine/rendering/CanvasRenderer.ts:1,3`

```typescript
// BEFORE:
import type {IRenderer, RenderCommand, TextStyleData} from '@engine/types/RenderingTypes.ts';
import type {AssetManager} from '@engine/systems/AssetManager.ts';

// AFTER:
import type {IRenderer, RenderCommand, TextStyleData} from '@engine/types/RenderingTypes';
import type {AssetManager} from '@engine/systems/AssetManager';
```

---

### 11. Add Warnings for Missing Assets

**Files:** `engine/rendering/DomRenderer.ts`, `engine/rendering/CanvasRenderer.ts`

**Pattern for each asset.get() call:**

```typescript
// BEFORE:
const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
if (imgAsset) imgEl.src = imgAsset.src;

// AFTER:
const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
if (imgAsset) {
    imgEl.src = imgAsset.src;
} else {
    this.logger.warn(`[DomRenderer] Asset '${cmd.assetId}' not found`);
}
```

**Apply to all asset.get() locations in both files.**

---

### 12. Add Warning for Uninitialized Renderer

**File:** `engine/rendering/DomRenderer.ts:51`

```typescript
// BEFORE:
flush(commands: RenderCommand[]): void {
    if (!this.containerElement) return;

// AFTER:
flush(commands: RenderCommand[]): void {
    if (!this.containerElement) {
        this.logger.warn('[DomRenderer] flush() called before successful init()');
        return;
    }
```

---

### 13. Fix Abstract/Interface Signature Mismatch

**File:** `engine/input/BaseInputAdapter.ts:23`

```typescript
// BEFORE:
abstract attach(container: IRenderContainer, options?: InputAttachOptions): boolean;

// AFTER:
abstract attach(container?: IRenderContainer, options?: InputAttachOptions): boolean;
```

**Also update subclasses:**

**File:** `engine/input/MockInputAdapter.ts`
```typescript
attach(container?: IRenderContainer, options?: InputAttachOptions): boolean {
    // Implementation
}
```

**File:** `engine/input/CompositeInputAdapter.ts`
```typescript
attach(container?: IRenderContainer, options?: InputAttachOptions): boolean {
    // Implementation
}
```

---

### 14. Move InputState to InputEvents.ts

**Action:** Move interfaces, don't create new file

**File:** `engine/types/InputEvents.ts` (add at bottom)

```typescript
// Move from engine/input/InputState.ts:

export interface InputState {
    keysDown: Set<string>;
    mouseButtonsDown: Set<number>;
    mousePosition: { x: number; y: number };
    touchPoints: Map<number, { x: number; y: number }>;
    gamepadStates: Map<number, GamepadState>;
}

export interface GamepadState {
    buttons: Map<number, { pressed: boolean; value: number }>;
    axes: Map<number, number>;
}
```

**Delete:** `engine/input/InputState.ts`

**Update import:** `engine/systems/InputManager.ts:11`
```typescript
// BEFORE:
import type {InputState} from "@engine/input/InputState";

// AFTER:
import type {InputState} from "@engine/types/InputEvents";
```

---

### 15. Add Try-Catch for Gamepad API

**File:** `engine/platform/GamepadInputAdapter.ts:150`

```typescript
// BEFORE:
const gamepads = navigator.getGamepads();

// AFTER:
let gamepads: (Gamepad | null)[];
try {
    gamepads = navigator.getGamepads();
} catch (error) {
    this.logger.error('[GamepadInputAdapter] Failed to get gamepads:', error);
    return;
}
```

---

### 16. Add Try-Catch in WebAudioSource + Move Error Logging

**File:** `engine/platform/webaudio/WebAudioSource.ts:22-28`

```typescript
// BEFORE:
start(when: number = 0, offset?: number, duration?: number): void {
    this.native.start(when, offset, duration);
    this.playing = true;
}

stop(when: number = 0): void {
    this.native.stop(when);
    this.playing = false;
}

// AFTER:
start(when: number = 0, offset?: number, duration?: number): void {
    try {
        this.native.start(when, offset, duration);
        this.playing = true;
    } catch (e) {
        // Expected if already started - ignore
    }
}

stop(when: number = 0): void {
    try {
        this.native.stop(when);
        this.playing = false;
    } catch (e) {
        // Only log unexpected errors
        if (!(e instanceof DOMException && e.name === 'InvalidStateError')) {
            console.warn('[WebAudioSource] Unexpected error on stop():', e);
        }
    }
}
```

**Then remove redundant try-catch:**

**File:** `engine/audio/SfxPool.ts:96-100`
```typescript
// BEFORE:
try {
    chain.source.stop();
} catch (e) {
    // Ignore errors
}

// AFTER:
chain.source.stop();
```

**File:** `engine/audio/VoicePlayer.ts:55-59` (same pattern)

---

### 17. Add RenderContainer Disposal

**Step 1 - Add to interface:**

**File:** `engine/interfaces/IRenderContainer.ts`
```typescript
export interface IRenderContainer {
    // ... existing methods

    /**
     * Clean up resources and cancel pending animation frames.
     * Called when the platform adapter is disposed.
     */
    dispose?(): void;
}
```

**Step 2 - Implement:**

**File:** `engine/platform/browser/DomRenderContainer.ts`
```typescript
private pendingFrameId?: number;

requestAnimationFrame(callback: () => void): () => void {
    const id = this.animationProvider?.requestAnimationFrame(callback);
    this.pendingFrameId = id;
    return () => {
        if (id) {
            this.animationProvider?.cancelAnimationFrame(id);
            this.pendingFrameId = undefined;
        }
    };
}

dispose(): void {
    if (this.pendingFrameId) {
        this.animationProvider?.cancelAnimationFrame(this.pendingFrameId);
        this.pendingFrameId = undefined;
    }
}
```

**Same for:** `engine/platform/browser/CanvasRenderContainer.ts`

**Step 3 - Call in adapters:**

**File:** `engine/platform/BrowserPlatformAdapter.ts:355`
```typescript
dispose(): void {
    // ... other cleanup
    if (this.renderContainer) {
        this.renderContainer.dispose?.();
    }
    this.renderContainer = null;
}
```

**Same for:** `engine/platform/HeadlessPlatformAdapter.ts:280`

---

### 18-20. Make Public Fields readonly (3 classes)

**File:** `engine/rendering/Dialogue.ts:7-8`
```typescript
// BEFORE:
public lines: DialogueLine[];
public currentIndex: number;

// AFTER:
public readonly lines: readonly DialogueLine[];
private currentIndex: number;
public getCurrentIndex(): number { return this.currentIndex; }
```

**File:** `engine/rendering/DialogueLine.ts:7-9`
```typescript
// BEFORE:
public speakerId: string;
public text: string;
public options: DialogueLineOptions;

// AFTER:
public readonly speakerId: string;
public readonly text: string;
public readonly options: Readonly<DialogueLineOptions>;
```

**File:** `engine/rendering/Speaker.ts:7-16`
```typescript
// Add readonly to all 10 fields:
public readonly id: string;
public readonly name: string;
public readonly displayName?: string;
public readonly portraitAssetId?: string;
public readonly voiceAssetId?: string;
public readonly textColor?: string;
public readonly nameColor?: string;
public readonly portraitPosition?: 'left' | 'right';
public readonly emotionStates?: Record<string, string>;
public readonly metadata?: Record<string, unknown>;
```

---

## PHASE 3: MEDIUM PRIORITY FIXES

**Estimated Time:** 2-3 hours
**Impact:** Code quality, maintainability

### 21. Add readonly to Constructor-Injected Dependencies

**Files requiring fixes (CORRECTED):**

1. `engine/systems/AudioManager.ts:34-40`
2. `engine/platform/browser/BackendAdapter.ts`
3. `engine/platform/browser/LocalStorageAdapter.ts`
4. `engine/platform/browser/asset_loaders/AudioLoader.ts`

**Pattern:**
```typescript
// BEFORE:
constructor(
    private eventBus: EventBus,
    private logger: ILogger
) {

// AFTER:
constructor(
    private readonly eventBus: EventBus,
    private readonly logger: ILogger
) {
```

---

### 22. Create Audio Barrel Export

**File:** `engine/audio/index.ts` (CREATE NEW)

```typescript
export { MusicPlayer, type MusicState, type MusicTrack } from './MusicPlayer';
export { SfxPool } from './SfxPool';
export { VoicePlayer } from './VoicePlayer';
export { AudioUtils } from './AudioUtils';
```

---

### 23. Remove Redundant Optional Chaining

**File:** `engine/rendering/CanvasRenderer.ts:38`

```typescript
// BEFORE:
this.ctx.clearRect(0, 0, this.canvas.width, this?.canvas?.height);

// AFTER:
this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
```

---

### 24. Fix Unsafe Spread Operator

**File:** `engine/rendering/DialogueLine.ts:18`

```typescript
// BEFORE:
this.options = {
    showPortrait: options.showPortrait !== false,
    showName: options.showName !== false,
    style: options.style,
    ...options
};

// AFTER:
this.options = {
    ...options,
    showPortrait: options.showPortrait !== false,
    showName: options.showName !== false,
};
```

---

### 25. Replace Magic Numbers with Constants

**Files:** `engine/rendering/helpers/DialogueLayoutHelper.ts:44`, `ChoiceLayoutHelper.ts:46,57,69`

```typescript
// Add import:
import { DEFAULT_Z_INDEX } from '@engine/constants/RenderingConstants';

// BEFORE:
const zIndex = dialogue.zIndex || 1000;

// AFTER:
const zIndex = dialogue.zIndex || DEFAULT_Z_INDEX.UI_DIALOGUE;
```

---

### 26-42. Additional Medium Issues

(Listed for completeness - implement as time permits)

26. SceneRenderer - Remove index signature
27. SceneRenderer - Add runtime validation before type assertions
28. UIRenderer - Fix ternary fallback logic
29. DomEffectTarget - Change `any` to `HTMLElement`
30. InputActionMapper - Add input type indexing for O(1) lookup
31. InputComboTracker - Skip combos when buffer too small
32. InputComboTracker - Validate non-empty inputs array
33. MockInputAdapter - Check enabled state before emitting
34. DomInputAdapter - Cache bound functions in constructor
35. InputComboTracker - Remove unused `_timer` parameter
36. CompositeInputAdapter - Support dynamic adapter management
37. CompositeInputAdapter - Fix type assertion for 'composite'
38. DomRenderContainer/CanvasRenderContainer - Return no-op function instead of null
39. ConsoleLogger - Change `any[]` to `unknown[]`
40. LocalStorageAdapter - Log invalid JSON at debug level
41. HeadlessPlatformAdapter - Document clear() behavior on dispose
42. Missing TSDoc on various public APIs

---

## PHASE 4: LOW PRIORITY (Polish)

**Estimated Time:** 1-2 hours

43. Add comprehensive TSDoc to audio helper classes
44. Update stale file path comments
45. Fix import style inconsistencies
46. Add throttling to high-frequency input events
47-50. Additional documentation improvements

---

## Implementation Strategy

### Recommended Order:

1. **PHASE 1 (CRITICAL)** - 2-3 hours
   - Fix all 6 critical issues
   - Run tests after each fix
   - Commit after phase completes

2. **PHASE 2 (HIGH)** - 3-4 hours
   - Fix issues 7-20
   - Run tests after each major change
   - Commit after phase completes

3. **PHASE 3 (MEDIUM)** - 2-3 hours
   - Fix issues 21-42 as time permits
   - Prioritize readonly and barrel exports
   - Commit after phase completes

4. **PHASE 4 (LOW)** - Optional
   - Documentation and polish
   - No functional changes
   - Can be done incrementally

### Testing Strategy:

After each phase:
```bash
npm run check:types  # Must pass with 0 errors
npm test            # Must maintain 408/409 passing
npm run build       # Must build successfully
```

### Git Strategy:

```bash
# After each phase:
git add .
git commit -m "Phase X: [description]"

# After all phases:
git push -u origin claude/comprehensive-codebase-audit-01BJNpp3WN6e8VV4hh2PwrXQ
```

---

## Success Criteria

**After PHASE 1:**
- All CRITICAL issues resolved
- Tests still passing
- No TypeScript errors

**After PHASE 2:**
- All memory leaks fixed
- All type safety issues resolved
- Tests still passing

**After PHASE 3:**
- Code quality improved
- All readonly modifiers added
- Barrel exports created

**Ready for V1 Release:**
- All CRITICAL and HIGH issues fixed
- MEDIUM issues addressed (as time permits)
- Tests: 408+/409 passing
- TypeScript: 0 errors
- "V1 Forever" principles upheld

---

## Estimated Total Time

- **PHASE 1 (CRITICAL):** 2-3 hours
- **PHASE 2 (HIGH):** 3-4 hours
- **PHASE 3 (MEDIUM):** 2-3 hours
- **PHASE 4 (LOW):** 1-2 hours

**Total:** 8-12 hours for complete fixes

**Minimum for production:** 5-7 hours (CRITICAL + HIGH only)

---

**Document Version:** 1.1 (Corrected)
**Last Updated:** 2025-01-14
**False Positives Removed:** 6
**Valid Issues:** 50
