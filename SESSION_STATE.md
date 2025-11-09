# **Session State \- Game Engine**

Last updated: 2025-11-10

**Purpose**: Quick context for resuming work.

**Current Goal**: Fix the failed v2.0 refactor to achieve the "A-Grade" vision for a clean, decoupled **Engine Library (Step 1\)**.

## **The Vision (Clarified)**

My core conflict was trying to build two different products at once. The new vision separates them:

* **Step 1: The Engine Library (The "Plug-and-Develop" Core)**  
  * **This is our CURRENT, FOCUSED GOAL.**  
  * This is an **unopinionated, 100% decoupled, reusable library** (a "bag of parts").  
  * It has *no* "non-negotiable" systems. The Engine is just a minimal host.  
  * The developer *is* the assembler. They are responsible for *plugging in* every system they need (even EventBus and StateManager) by registering them with the SystemContainer.  
  * This is the "A-Grade" architecture that solves the "Phaser trauma" by providing clean, high-level, testable systems.  
* **Step 2: The Game Frameworks (The "Batteries-Included" Product)**  
  * This is a **FUTURE** project, to be built *on top of* the clean library from Step 1\.  
  * These *are* **opinionated** (e.g., a "RenPy-killer" for Visual Novels).  
  * They *will* be "batteries-included," pre-registering all the core systems and plugins (like SaveManager, DialoguePlugin, etc.) so the developer can just "plug-and-play" their game data.  
  * This solves the "RenPy trauma" by building an easy-to-use framework on a non-monolithic base.

## **Current Status: C- (Failing)**

The current repo is a **failed refactor**. It *attempted* to build the platform abstraction layer (Step 1\) but failed to execute it cleanly, resulting in a contradictory "C-" codebase that *violates* the "plug-and-develop" vision.

**The "Senior Review" Summary:** The vision is A-grade, the execution is C-. The codebase is a half-finished refactor, leaving a tangled mess of old and new patterns.

### **Key Failures We MUST Fix:**

1. **CRITICAL FAIL: The DI Mess**  
   * We have four conflicting patterns: SystemRegistry (Service Locator), SystemContainer (DI Container), SystemFactory (Static Factory), and SystemContainerBridge (a "glue" hack).  
   * This combination is over-engineered, confusing, and contradictory.  
2. **CRITICAL FAIL: The Monolith**  
   * SystemDefinitions.ts is a 250-line monolith that hardcodes the creation of *every* system.  
   * This *is* the "batteries-included" (Step 2\) logic living *inside* our "plug-and-develop" (Step 1\) library. It completely violates the vision.  
3. **FAIL: Platform Abstraction is Incomplete & Ignored**  
   * The abstraction was built (IPlatformAdapter, IAudioPlatform) and then *ignored* by the engine's core.  
   * SystemDefinitions.ts still hardcodes new window.AudioContext().  
   * InputManager.ts is a 300-line "God Class" that *bypasses* the platform to call navigator.getGamepads() and window.setInterval() directly.  
4. **FAIL: Code Quality & SRP**  
   * Interface files (IAudioPlatform.ts, IRenderContainer.ts) are bloated with concrete implementations.  
   * The PluginManager's uninstall feature is incomplete and known to be broken.  
   * Tests (e.g., SfxPool.test.ts) access private state using (as any), making them fragile.

## **Repository State**

* **Branch:** master  
* **Last Commit:** 9e19a6f (This commit *claimed* to be clean but *is not*.)  
* **Working State:** **FAILED REFACTOR.** The code is a contradictory mix of old and new patterns. The "Senior Review" is correct, and the "Architecture Achievements" listed in the old SESSION\_STATE.md were **false**.

## **IMMEDIATE NEXT STEPS: Roadmap to an "A+" (The "Refactor-of-the-Refactor")**

This is the new plan. We must execute this to achieve the **Step 1: Engine Library** vision.

### **1\. CLEAN HOUSE: Fix the DI Mess**

* \[ \] **DELETE:** engine/core/SystemFactory.ts  
* \[ \] **DELETE:** engine/core/SystemRegistry.ts (and its test)  
* \[ \] **DELETE:** engine/core/SystemContainerBridge.ts  
* \[ \] **DELETE:** engine/core/SystemDefinitions.ts (the monolith)  
* \[ \] **ESTABLISH:** engine/core/SystemContainer.ts as the **one and only** DI container.  
* \[ \] **REFACTOR:** engine/Engine.ts to be a minimal "host."  
  * Its constructor should *only* create the SystemContainer and register itself and the platform adapter.  
  * It should *not* pre-register any "core" systems.  
* \[ \] **CREATE:** engine/core/CoreServices.ts (or similar). This file will export *definitions* (recipes) for platform-agnostic systems like EventBus, StateManager, PluginManager, AssetManager.  
* \[ \] **CREATE:** engine/platform/PlatformServices.ts (or similar). This file will export *definitions* (recipes) for platform-aware systems like AudioManager, InputManager, and RenderManager. These recipes will *use the platform adapter* correctly.

### **2\. FIX THE ABSTRACTION: Decouple Platform Code**

* \[ \] **REFACTOR:** engine/systems/InputManager.ts (the "God Class").  
  * It must be refactored into a clean facade, just like AudioManager.ts.  
  * **DELETE** pollGamepads() and window.setInterval().  
  * Its *only* public entry point should be processEvent(event: EngineInputEvent).  
* \[ \] **CREATE:** engine/platform/GamepadInputAdapter.ts.  
  * This *new* class will implement IInputAdapter.  
  * It will contain the navigator.getGamepads and polling logic.  
  * It will emit generic gamepadbutton and gamepadaxis events.  
* \[ \] **UPDATE:** engine/platform/BrowserPlatformAdapter.ts.  
  * It must now provide *all* relevant adapters: getInputAdapters(): IInputAdapter\[\] { return \[new DomInputAdapter(), new GamepadInputAdapter()\]; }  
* \[ \] **UPDATE:** The Engine.ts start() flow.  
  * It must be responsible for getting the adapters from this.platform and wiring them to the InputManager's processEvent() method.  
* \[ \] **FIX:** The AssetManager's creation (in its new CoreServices.ts recipe) to get the AudioContext from the IAudioPlatform adapter, *never* from window.

### **3\. FIX CODE QUALITY: Single Responsibility Principle**

* \[ \] **MOVE:** All implementations (e.g., WebAudioPlatform, DomRenderContainer) *out* of their interface files (IAudioPlatform.ts, IRenderContainer.ts) and into their own dedicated files.  
* \[ \] **FIX:** The PluginManager / Engine / SaveManager lifecycle.  
  * The Engine must expose unregisterSerializableSystem(key: string).  
  * PluginManager.ts's uninstall method must call this to complete the lifecycle.  
* \[ \] **REFACTOR:** The SfxPool.test.ts (and any others) to *not* use (as any) to access private state. Tests must *only* use the public API.

### **CRITICAL RULES**

(From CLAUDE.md)

**BEFORE accepting ANY changes to the codebase, we MUST run:**

1. **TypeScript type check**: npm run check:types  
2. **All tests**: npm test

**NEVER proceed if either fails.**

### **Files to Read for Context**

* CLAUDE.md: For the rules.  
* SESSION\_STATE.md: **This file.** This is the new source of truth.  
* AUDIT\_REPORT.md: The *original* audit that correctly identified the platform-coupling problems (which were never fixed).  
* engine/systems/InputManager.ts: The "God Class" that needs refactoring.  
* engine/systems/AudioManager.ts: The "Good Facade" pattern to copy.  
* engine/core/SystemDefinitions.ts: The *monolith* that will be deleted.  
* engine/interfaces/IPlatformAdapter.ts: The abstraction that *must* be enforced.