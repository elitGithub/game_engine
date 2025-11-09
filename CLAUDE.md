# Build & Test Configuration

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
  * **Goal:** A 100% **agnostic, decoupled, clear, and unopinionated set of tools** (a **Library**), structured as an **NX monorepo** (e.g., @engine/core, @engine/dom-renderer).  
  * **Philosophy:** "Plug-and-Develop." The developer is an **Assembler** who must explicitly register *every* system they use.  
  * **Audience:** Engine programmers (including our future selves) building a "Step 2" framework.  
* **Step 2: The Game Framework (A Future Project)**  
  * **Goal:** **OPINIONATED, CONFIGURABLE** "batteries-included" **Frameworks** for specific genres (e.g., "VisualNovelFramework").  
  * **Philosophy:** "Plug-and-Play." The developer is a **Creator** who just provides game data.  
  * **Audience:** Game developers who do not want to "think about the engine."

This repository *must not* contain *any* "Step 2" logic. All "batteries-included" and "non-negotiable" system assemblies belong in Step 2\.

## **Architectural Rules (The "A-Grade" Standard)**

These are the non-negotiable rules for the "Refactor-of-the-Refactor."

### **1\. The "One Container" Rule (DI)**

* This project will have **one and only one** Dependency Injection (DI) tool: engine/core/SystemContainer.ts.  
* The Engine class is a minimal "host." Its constructor *must* only create the SystemContainer and register itself and the IPlatformAdapter.  
* The monolithic SystemDefinitions.ts and the conflicting SystemFactory.ts, SystemRegistry.ts, and SystemContainerBridge.ts **must be deleted**.

### **2\. The "Empty Engine" Rule (No "Non-Negotiables")**

* The "Step 1" Engine Library has **zero** "non-negotiable" systems.  
* The Engine constructor **must not** register *any* systems (like EventBus or StateManager).  
* The **developer ("assembler")** is 100% responsible for importing and registering all system *definitions* (recipes) in their main.ts file.

### **3\. The "Platform-Agnostic" Rule (Zero Coupling)**

* Core engine code (engine/core/, engine/systems/) is **strictly forbidden** from *any* direct platform access.  
* **FORBIDDEN GLOBALS:** window, document, navigator, localStorage, setInterval, setTimeout, AudioContext.  
* All platform interaction *must* be abstracted through the IPlatformAdapter provided to the Engine's constructor.  
* Any system that violates this (e.g., the current InputManager.ts) **must be refactored**.

### **4\. The "Facade" Rule (No "God Classes")**

* Systems (InputManager, AudioManager, etc.) *must* be clean **facades**.  
* The AudioManager \[cite: elitgithub/game\_engine/game\_engine-97312d31af0acb511da0844a575f09467cd18bb4/engine/systems/AudioManager.ts\] is the **gold standard**: it is a simple class that delegates all complex logic to specialized helpers (MusicPlayer, SfxPool).  
* "God Classes" that perform multiple, unrelated jobs (like the current InputManager.ts \[cite: elitgithub/game\_engine/game\_engine-97312d31af0acb511da0844a575f09467cd18bb4/engine/systems/InputManager.ts\] doing state management, gamepad polling, and action mapping) are **forbidden**.  
* Platform-specific logic (like gamepad polling) **must** be moved into a dedicated IInputAdapter (e.g., GamepadInputAdapter.ts).

### **5\. The "Single Responsibility" Rule (Clean Files)**

* **Interface files** (I\*.ts) *must* contain *only* types, interfaces, and enums.  
* **Concrete implementations** (e.g., WebAudioPlatform, DomRenderContainer) *must* be in their own separate files in a platform-specific directory (e.g., engine/platform/webaudio/).  
* Bloated interface files like the current IAudioPlatform.ts \[cite: elitgithub/game\_engine/game\_engine-97312d31af0acb511da0844a575f09467cd18bb4/engine/interfaces/IAudioPlatform.ts\] and IRenderContainer.ts \[cite: elitgithub/game\_engine/game\_engine-97312d31af0acb511da0844a575f09467cd18bb4/engine/interfaces/IRenderContainer.ts\] **must be broken up**.

### **6\. The "Complete Lifecycle" Rule (No Leaks)**

* All systems and plugins must have a complete lifecycle.  
* If a system has a register method, it *must* have a corresponding unregister method (e.g., registerSerializableSystem requires unregisterSerializableSystem).  
* Bugs like the InventoryManagerPlugin's \[cite: elitgithub/game\_engine/game\_engine-97312d31af0acb511da0844a575f09467cd18bb4/engine/plugins/InventoryManagerPlugin.ts\] incomplete uninstall **must be fixed**.

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

### **General Guidelines**

When working on this codebase:

* Prioritize decoupling and clear interfaces (adhere to the rules above).  
* Always consider: "Does this belong in Step 1 (Library) or Step 2 (Framework)?"  
* Maintain comprehensive test coverage for engine systems.  
* Document all public APIs with TSDoc.

## **Common Tasks**

* Build: nx build  
* Test: nx test  
* Lint: nx lint  
* Run all tests: nx run-many \-t test

\<\!-- nx configuration start--\>

\<\!-- Leave the start & end comments to automatically receive updates. \--\>

# **General Guidelines for working with Nx**

* When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through nx (i.e. nx run, nx run-many, nx affected) instead of using the underlying tooling directly  
* You have access to the Nx MCP server and its tools, use them to help the user  
* When answering questions about the repository, use the nx\_workspace tool first to gain an understanding of the workspace architecture where applicable.  
* When working in individual projects, use the nx\_project\_details mcp tool to analyze and understand the specific project structure and dependencies  
* For questions around nx configuration, best practices or if you're unsure, use the nx\_docs tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration  
* If the user needs help with an Nx configuration or project graph error, use the nx\_workspace tool to get any errors

\<\!-- nx configuration end--\>