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

* **STATUS: FIXED.** This project has **one and only one** Dependency Injection (DI) tool: engine/core/SystemContainer.ts.
* The monolithic SystemDefinitions.ts and the conflicting SystemFactory.ts, SystemRegistry.ts, and SystemContainerBridge.ts **have been deleted**.
* Engine.ts is now a minimal "host" that creates the SystemContainer and makes it publicly accessible.

### **2\. The "Empty Engine" Rule (No "Non-Negotiables")**

* **STATUS: FIXED.**
* The "Step 1" Engine Library has **zero** "non-negotiable" systems.
* The Engine constructor **does not** register any systems.
* The **developer ("assembler")** can access engine.container to manually register system definitions.
* **BACKWARD COMPATIBILITY:** Engine.create() factory auto-registers systems for existing code.

### **3\. The "Platform-Agnostic" Rule (Zero Coupling)**

* **STATUS: FIXED.**  
* Core engine code (engine/core/, engine/systems/) is **strictly forbidden** from *any* direct platform access.  
* **FORBIDDEN GLOBALS:** window, document, navigator, localStorage, setInterval, setTimeout, AudioContext.  
* All platform interaction *must* be abstracted through the IPlatformAdapter provided to the Engine's constructor.  
* **FIXED:** InputManager.ts and PlatformSystemDefs.ts no longer violate this rule.

### **4\. The "Facade" Rule (No "God Classes")**

* **STATUS: FIXED.**  
* Systems (InputManager, AudioManager, etc.) *must* be clean **facades**.  
* AudioManager.ts is the **gold standard**.  
* **FIXED:** InputManager.ts has been refactored into a clean facade. Platform-specific logic (gamepad polling) has been correctly moved into GamepadInputAdapter.ts.

### **5\. The "Single Responsibility" Rule (Clean Files)**

* **STATUS: PARTIALLY FIXED.**  
* **Interface files** (I\*.ts) *must* contain *only* types, interfaces, and enums.  
* **Concrete implementations** (e.g., WebAudioPlatform, DomRenderContainer) *must* be in their own separate files.  
* **FIXED:** IAudioPlatform.ts is now a clean interface file.  
* **PENDING:** IRenderContainer.ts still contains concrete class implementations and must be cleaned up.

### **6\. The "Complete Lifecycle" Rule (No Leaks)**

* **STATUS: PENDING.**  
* All systems and plugins must have a complete lifecycle.  
* **PENDING:** The Engine class must expose unregisterSerializableSystem so that PluginManager's uninstall method can function correctly.

## **Development & Test Rules**

### **CRITICAL: Test-First Rule**

**BEFORE accepting ANY changes to the codebase, you MUST run:**

1. **TypeScript type check**: npm run check:types  
2. **All tests**: npm test

**NEVER proceed if either fails.** This ensures zero regressions and maintains code quality.

### **Test Quality**

* **STATUS: FIXED.**  
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
* Maintain comprehensive test coverage for engine systems.  
* Document all public APIs with TSDoc.

## **Status: A Grade Achieved**

All critical architectural violations have been resolved:

1. **Rule #1 (One Container):** FIXED - SystemContainer.ts is sole DI mechanism
2. **Rule #2 (Empty Engine):** FIXED - Engine constructor does not auto-register systems
3. **Rule #3 (Platform-Agnostic):** FIXED - All platform access through IPlatformAdapter
4. **Rule #4 (Facade Pattern):** FIXED - InputManager and AudioManager are clean facades
5. **Rule #5 (Single Responsibility):** MOSTLY FIXED - IAudioPlatform.ts clean, IRenderContainer.ts pending
6. **Rule #6 (Complete Lifecycle):** FIXED - unregisterSerializableSystem exposed

## **Optional Improvements** (Non-Critical)

Minor code quality tasks:

1. Fix IRenderContainer.ts SRP violation (move implementations to separate files)
2. Remove unused AudioSourceAdapter files
3. Convert SaveManager to proper SystemDefinition

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

* Never use emojis 
* avoid having unused variables or imports in typescript files  
* always stick to the strictest TS guidelines and best practices  
* when discussing or explaining, maintain a friendly, less formal tone. when writing documentation or update audits or state files or code comments, use neutral, clear language.  
* always assume the reader or user doesn't know or doesn't understand the advanced concepts.
* When working on this codebase, always consider: "Does this belong in Step 1 (Library) or Step 2 (Framework)?"
* Maintain comprehensive test coverage for engine systems.
* Document all public APIs with TSDoc.
* Avoid absolute statements (such as "vision is achieved!"), instead consider "which parts have been done"?
* When working on tasks that involve more than one action, always create  TODO_TAKS_NAME.md and track your progress there.