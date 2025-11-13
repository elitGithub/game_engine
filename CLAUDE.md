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
* Maintain comprehensive test coverage for engine systems.  
* Document all public APIs with TSDoc.
* Do not commit or push code without user approval
* Always consider PERFORMANCE when refactoring or creating code. 
* Do not use any "hacks" or "workarounds"
* Do not consider an issue as resolved or "100% done" until it is reviewed again by you, approved by the user AND all tests pass. 

## **Optional Improvements** (Non-Critical)

Minor code quality tasks for future consideration:

1. Consider converting SaveManager to proper SystemDefinition pattern
2. Review and remove any unused utility files
3. Consider migrating to NX monorepo structure (see vision below)

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