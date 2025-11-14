# **Build & Test Configuration**

This project uses:

* **TypeScript** for type safety  
* **Vite** for building and development  
* **Vitest** for testing

## **Common Tasks**

* Build: npm run build  
* Test: npm test  
* Test with UI: npm run test:ui  
* Type check: npm run check:types  
* Dev server: npm run dev

# **The Two-Step Architectural Vision**

This document defines the **strict architectural rules** for this project.

Its purpose is to guide the **"refactor-of-the-refactor,"** correcting the failures of the v2.0 (9e19a6f) release. It enforces the **"Step 1: Engine Library"** vision and serves as the "law" for all future code.

This project is **Step 1** and *only* Step 1\.

* **Step 1: The Engine Library (This Repository's Goal)**
  * **Goal:** A 100% **agnostic, decoupled, clear, and unopinionated set of tools** (a **Library**), with the long-term vision of structuring as an **NX monorepo** (e.g., @engine/core, @engine/dom-renderer).
  * **Core Ideal:** V1 Forever. Build once, never have to re-build. The engine MUST be ready for the future. Patches are not acceptable solutions. Consider bulletproof, clean, robust solutions.
  * **Current State:** Single-package TypeScript project using Vite + Vitest. NX migration is a future consideration.
  * **Philosophy:** "Plug-and-Develop." The developer is an **Assembler** who must explicitly register *every* system they use.
  * **Audience:** Engine programmers (including our future selves) building a "Step 2" framework.  
* **Step 2: The Game Framework (A Future Project)**  
  * **Goal:** **OPINIONATED, CONFIGURABLE** "batteries-included" **Frameworks** for specific genres (e.g., "VisualNovelFramework").  
  * **Philosophy:** "Plug-and-Play." The developer is a **Creator** who just provides game data.  
  * **Audience:** Game developers who do not want to "think about the engine."

This repository *must not* contain *any* "Step 2" logic. All "batteries-included" and "non-negotiable" system assemblies belong in Step 2\.

## **Architectural Rules (The "A-Grade" Standard)**

These are the non-negotiable rules for the "Refactor-of-the-Refactor."

## **Development & Test Rules**

### **CRITICAL: Test-First Rule**

**BEFORE accepting ANY changes to the codebase, you MUST run:**

1. **TypeScript type check**: npm run check:types  
2. **All tests**: npm test

**NEVER proceed if either fails.** This ensures zero regressions and maintains code quality.

### **Test Quality**
 
* Tests **must not** access private state via (as any).  
* Tests *must* only use the public API of a class.  
* If a class is "hard to test," it is a sign that the *class's API is bad*, and the *class* must be refactored.

### **Communication Style**

* **NEVER use emojis** in code, comments, commit messages, documentation, or any communication related to this project.  
* Use clear, technical, professional language without unnecessary embellishments or emotional expressions.

### **General Guidelines**

When working on this codebase:

* Prioritize decoupling and clear interfaces (adhere to the rules above).  
* Always consider: "Does this belong in Step 1 (Library) or Step 2 (Framework)?"
* Always consider: "Is this a good design choice?"
* Always consider: "Is this a good API?"
* Always consider: "Is this a good implementation?"
* Always consider: "Is this a good test?"
* Always consider: "Is this a good documentation?"
* Always consider: "Is this a good audit?"
* Always consider: "Is this a good state file?"
* Always consider: "Is this a good code comment?"
* Always consider: "How does this impact performance?"
* Always consider: "How does this impact maintainability?"
* Maintain comprehensive test coverage for engine systems.  
* Document all public APIs with TSDoc.
* Do not commit or push code without user approval
* Always consider PERFORMANCE when refactoring or creating code. 
* Do not use any "hacks" or "workarounds"
* Do not consider an issue as resolved or "100% done" until it is reviewed again by you, approved by the user AND all tests pass. 

## **Performance Optimizations (Completed)**

The following performance optimizations have been implemented to ensure production-ready performance:

### SaveManager - Incremental Snapshot Optimization
- **Issue**: Full game state cloning on every load caused stuttering (100ms+ for 1MB saves)
- **Fix**: Implemented incremental snapshot - only clone systems that will be modified
- **Impact**: 50-90% reduction in snapshot time, eliminates user-visible stuttering
- **Location**: engine/systems/SaveManager.ts:105-131

### EffectManager - Zero-Allocation Update Loop
- **Issue**: Array cloning every frame caused GC pressure in effect-heavy games
- **Fix**: Replaced spread operator with reverse iteration for safe self-removal
- **Impact**: Eliminates ~600 allocations/sec in typical scenarios
- **Location**: engine/systems/EffectManager.ts:37-53

### AudioManager - Configurable Volume Defaults
- **Issue**: Hardcoded volume defaults (0.7, 0.8) were opinionated
- **Fix**: Added optional volume configuration to AudioManagerOptions
- **Impact**: Maintains sensible defaults while allowing explicit override
- **Location**: engine/interfaces/index.ts:60-68, engine/systems/AudioManager.ts:63-75

### TypeScript - Strict Compiler Checks
- **Added**: noUnusedLocals, noUnusedParameters, noFallthroughCasesInSwitch
- **Impact**: Catches additional bugs at compile time, enforces code quality
- **Location**: tsconfig.json:14-16

### TypeScript - Import Type Consistency
- **Issue**: Regular imports used for type-only references (prevents optimal tree-shaking)
- **Fix**: Converted 35+ imports to `import type` across 28 source files
- **Impact**: Improved bundle optimization, clearer intent, TypeScript best practices
- **Most common**: ILogger converted in 26 files, plus EventBus, GameState, type definitions

### Documentation - Rendering Helpers TSDoc
- **Issue**: Rendering helper classes lacked comprehensive API documentation
- **Fix**: Added complete TSDoc comments to all 6 rendering helper classes
- **Documented**: DialogueLayoutHelper, ChoiceLayoutHelper, SceneRenderer, TextRenderer, TypewriterEffect, UIRenderer
- **Impact**: Clear API documentation with examples, emphasizes platform-agnostic design

## **Critical Fixes (Code Review - 2025-01-13)**

### Audio System - Memory Leak Fixes
- **Issue**: SfxPool and VoicePlayer leaked memory - audio chains/voices never cleaned up after natural completion
- **Fix**: Added IAudioSource.onEnded() callback interface, implemented in WebAudioSource and mock implementations
- **Impact**: Eliminates unbounded memory growth in audio system - critical for long-running games
- **Location**: engine/interfaces/IAudioPlatform.ts:205-214, engine/audio/SfxPool.ts:52-63, engine/audio/VoicePlayer.ts:36-42

### Code Quality Improvements
- **Unused Parameters**: Cleaned up InputManager and RenderManager - logger/eventBus now properly used
- **Type Safety**: Added proper return types to all ISerializable implementations (LocalizationManager, ValueTracker, CollectionTracker)
- **Logging Abstraction**: Fixed SceneRenderer to use injected ILogger instead of console.warn
- **API Refactor**: Removed customCSS from TextStyleData to enforce a purely semantic, platform-agnostic style interface. This resolves the previous implementation gap.
- **Type System**: Fixed InputMode to remove | string (preserved IDE autocomplete)
- **Symbol Constants**: Defined SaveManager symbol constant in CORE_SYSTEMS
- **Engine.log**: Changed from any[] to unknown[] for better type safety
- **Dice Ergonomics**: Added Math.random as default RNG parameter (maintains testability)
- **Impact**: Improved type safety, maintainability, and API consistency throughout codebase

## **Architectural Improvements (Code Review - 2025-01-13)**

Following a comprehensive architectural review, 5 medium-priority issues were identified and resolved to achieve true "V1 Forever" bulletproof design:

### SceneManager - History Corruption Prevention
- **Issue**: goBack() destructively popped history before validating navigation success, causing history corruption if target scene was missing
- **Fix**: Peek-then-pop pattern - only remove from history after successful navigation
- **Impact**: Eliminates edge-case history corruption, enables safe retry on failure
- **Location**: engine/systems/SceneManager.ts:126-140
- **Tests**: Added test for missing scene edge case (engine/tests/SceneManager.test.ts:158-191)

### AssetManager - Runtime Type Validation
- **Issue**: Blind type casting in get<T>() allowed silent type mismatches (e.g., AudioBuffer as HTMLImageElement)
- **Fix**: Store asset type metadata in cache, add optional runtime validation parameter to get<T>()
- **Impact**: Fail-fast type safety prevents renderer crashes, maintains backward compatibility
- **API Enhancement**: Added getType() method for type inspection, optional expectedType parameter for validation
- **Location**: engine/systems/AssetManager.ts:23-26, 148-179
- **Tests**: 6 comprehensive type validation tests (engine/tests/AssetManager.test.ts:202-283)

### UIRenderer - Explicit Z-Index Constants
- **Issue**: Magic numbers (10000, 20000) created invisible layering constraints
- **Fix**: Created DEFAULT_Z_INDEX constants with documented hierarchy
- **Impact**: Self-documenting layering system, explicit developer control
- **Constants**: engine/constants/RenderingConstants.ts (WORLD, BACKGROUND, SPRITES, UI_BARS, UI_MENUS, UI_DIALOGUE, OVERLAY, DEBUG)
- **Location**: engine/rendering/helpers/UIRenderer.ts (updated to use constants)

### IInputAdapter - Circular Dependency Resolution
- **Issue**: Interface file exported concrete implementations, creating circular dependency
- **Fix**: Separated interface definitions from implementations, created proper barrel exports
- **Impact**: Clean architectural boundaries, prepares for NX monorepo migration
- **Changes**:
  - Removed implementation re-exports from engine/interfaces/IInputAdapter.ts
  - Created engine/input/index.ts barrel file for implementations
  - Updated imports in BrowserPlatformAdapter, HeadlessPlatformAdapter, DomInputAdapter, GamepadInputAdapter
- **Pattern**: Interfaces from @engine/interfaces, implementations from @engine/input

### VoicePlayer - Test Quality Compliance
- **Issue**: Memory leak tests violated "no (as any)" rule by accessing private activeVoices Set
- **Fix**: Added public getActiveVoiceCount() method marked with @internal
- **Impact**: Maintains test quality standards while enabling critical memory leak detection
- **Location**: engine/audio/VoicePlayer.ts:74-76
- **Tests**: Updated engine/tests/VoicePlayer.memory.test.ts to use public API

**Test Results**: 398/399 passing (1 appropriately skipped), 0 TypeScript errors
**Performance**: No overhead - all fixes maintain or improve performance characteristics

## **Optional Improvements** (Non-Critical)

Minor code quality tasks for future consideration:

1. Review and remove any unused utility files
2. Consider migrating to NX monorepo structure (see vision below)

## **Common Tasks**

* Build: npm run build
* Test: npm test
* Type check: npm run check:types
* Test with UI: npm run test:ui
* Dev server: npm run dev
* Never use emojis 
* avoid having unused variables or imports in typescript files  
* always stick to the strictest TS guidelines and best practices  
* when discussing or explaining, maintain a friendly, less formal tone. when writing documentation or update audits or state files or code comments, use neutral, clear language.  
* always assume the reader or user doesn't know or doesn't understand the advanced concepts.
* When working on this codebase, always consider: "Does this belong in Step 1 (Library) or Step 2 (Framework)?"
* Maintain comprehensive test coverage for engine systems.
* Document all public APIs with TSDoc.
* Avoid absolute statements (such as "vision is achieved!"), instead consider "which parts have been done"?
* When working on tasks that involve more than one action, always create TODO_TAKS_NAME.md and track your progress there.
* STRICT: all classes MUST BE in their own files. A file MUST NOT contain more than 1 (ONE) class

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# Note: NX Monorepo Migration (Future Consideration)

**Current Reality:** This project is NOT currently an NX monorepo. It's a single-package TypeScript project using Vite and Vitest.

**Vision:** The long-term architectural goal includes potentially migrating to an NX monorepo structure with separate publishable packages (e.g., @engine/core, @engine/dom-renderer, @engine/canvas-renderer, @engine/web-audio).

**Benefits of NX Migration:**
- Clear package boundaries and dependency management
- Independent versioning and publishing
- Build caching and task orchestration
- Better scalability for a multi-package library

**When to Consider Migration:**
- When the codebase stabilizes architecturally
- When there's a clear need for independent package publishing
- When the current single-package structure becomes limiting

Until then, continue using npm scripts: `npm run build`, `npm test`, `npm run check:types`.

<!-- nx configuration end-->