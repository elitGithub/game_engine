# Build & Test Configuration

This project uses:
- **TypeScript** for type safety
- **Vite** for building and development
- **Vitest** for testing

## Common Tasks
- Build: `npm run build`
- Test: `npm test`
- Test with UI: `npm run test:ui`
- Type check: `npm run check:types`
- Dev server: `npm run dev`

# Project Vision

## Core Philosophy

This is a **plug-and-develop game engine** designed with the following principles:

- **Decoupled Architecture**: Clear separation between engine and game layers
- **Robustness**: Reliable, well-tested core systems with comprehensive safety nets
- **Extensibility**: Easy to extend without modifying core engine code
- **Unopinionated**: No forced patterns or structures on game developers
- **Configurability**: Clear, simple configuration over hard-coded behavior

## Developer Experience Goals

The ideal workflow:
1. Developer installs the engine
2. Developer configures which systems they need
3. Developer focuses exclusively on game layer: logic, plugins, and assets
4. Developer **never touches engine code**

The engine should be invisible infrastructure that just works.

## Architecture Principles

### Engine Layer (Hands Off)
- Core systems that power the game
- Should be stable, tested, and require no modification
- Provides extension points, not modification requirements
- Must be thoroughly documented with clear APIs

### Game Layer (Developer Focus)
- Game-specific logic and behavior
- Custom plugins and extensions
- Assets and content
- Configuration files

### Key Rule
**When the project is complete, developers should only add systems they need, not modify the engine itself.**

## Development Guidelines

When working on this codebase:
- Prioritize decoupling and clear interfaces
- Always consider: "Does this require engine modification or can it be a plugin?"
- Maintain comprehensive test coverage for engine systems
- Document all extension points and APIs
- Keep configuration simple and declarative
- Preserve the separation between engine and game concerns

## Common Tasks
- Build: `nx build`
- Test: `nx test`
- Lint: `nx lint`
- Run all tests: `nx run-many -t test`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors


<!-- nx configuration end-->