// import { Engine, type EngineConfig } from '@engine/Engine';
// import { BrowserPlatformAdapter } from '@engine/platform/BrowserPlatformAdapter';
// import { createCoreSystemDefinitions, CORE_SYSTEMS } from '@engine/core/CoreSystemDefs';
// import { createPlatformSystemDefinitions, type PlatformSystemConfig, PLATFORM_SYSTEMS } from '@engine/core/PlatformSystemDefs';
// import { GameStateManager } from '@engine/core/GameStateManager';
// import { GameState } from '@engine/core/GameState';
// import { SystemContainer } from '@engine/core/SystemContainer';
//
// // 1. Define the Game Data (The "TGame" type)
// interface ProtocolState {
//     evidenceCollected: Set<string>; // e.g., 'poster_code'
//     inventory: string[];            // e.g., 'data_chip'
//     jaxTrust: number;               // 0-100
// }
//
// // 2. Define a minimal Initial State (Bootstrap)
// class BootState extends GameState<ProtocolState> {
//     constructor(private container: SystemContainer) {
//         super('boot', container.get(PLATFORM_SYSTEMS.Logger));
//     }
//
//     enter(): void {
//         super.enter();
//         const logger = this.container.get(PLATFORM_SYSTEMS.Logger);
//         logger.log('__BOOT__Sequence_Initiated__');
//
//         // TODO: Load Assets here via AssetManager
//
//         // Remove loader from DOM
//         document.getElementById('loader')?.remove();
//
//         logger.log('Ready for input.');
//     }
// }
//
// // 3. The Assembly Function
// async function main() {
//     // A. Create Platform
//     const platform = new BrowserPlatformAdapter({
//         containerElement: document.getElementById('game-container')!,
//         renderType: 'dom', // Start with DOM renderer for UI/Text focus
//         audio: true,
//         input: true
//     });
//
//     // B. Create Engine
//     const engine = await Engine.create({
//         platform,
//         gameVersion: '0.1.0',
//         gameState: {
//             evidenceCollected: new Set(),
//             inventory: [],
//             jaxTrust: 10
//         } as ProtocolState,
//         // Legacy config - strictly required by interface but handled by DI below
//         systems: {}
//     });
//
//     // C. Register Systems (The "Plug" phase)
//     const coreDefs = createCoreSystemDefinitions();
//     const platformDefs = createPlatformSystemDefinitions(platform, {
//         assets: true,
//         audio: true,
//         effects: true, // For screen shake / flash
//         input: true,
//         renderer: { type: 'dom' }
//     });
//
//     // Register everything
//     [...coreDefs, ...platformDefs].forEach(def => engine.container.register(def));
//
//     // D. Initialize
//     await engine.initializeSystems();
//
//     // E. Register Game States
//     const stateManager = engine.container.get<GameStateManager<ProtocolState>>(CORE_SYSTEMS.StateManager);
//     stateManager.register('boot', new BootState(engine.container));
//
//     // F. Launch
//     engine.start('boot');
// }
//
// main().catch(console.error);