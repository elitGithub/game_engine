// engine/core/SystemFactory.ts
/**
 * SystemFactory - Creates and wires up engine systems from config
 *
 * Now uses SystemContainer for dependency injection and lazy-loading.
 * Systems are created automatically based on their declared dependencies.
 *
 * This provides a backward-compatible API while using the new DI system internally.
 */

import type {SystemRegistry} from './SystemRegistry';
import type {PlatformContainer} from './PlatformContainer';
import {SystemContainer, type SystemDefinition, type ISystemFactoryContext} from './SystemContainer';
import {createCoreSystemDefinitions} from './SystemDefinitions';


/**
 * System configuration options
 */
export interface SystemConfig {
    audio?: boolean | {
        volume?: number;
        musicVolume?: number;
        sfxVolume?: number;
    };
    assets?: boolean;
    save?: boolean | {
        adapter?: unknown;
    };
    effects?: boolean;
    input?: boolean;
    renderer?: { type: 'canvas' | 'dom' | 'svelte' };
}

/**
 * Creates and configures engine systems based on user config
 *
 * Now uses SystemContainer internally for proper dependency injection.
 */
export class SystemFactory {
    /**
     * Create all systems specified in config
     *
     * Uses SystemContainer for dependency injection and lazy-loading.
     * Systems are created automatically based on their dependencies.
     *
     * @param config System configuration
     * @param registry System registry (for backward compatibility)
     * @param container Platform-agnostic container (optional)
     */
    static create(
        config: SystemConfig,
        registry: SystemRegistry,
        container?: PlatformContainer
    ): void {
        // Create a hybrid container that bridges SystemContainer and SystemRegistry
        const systemContainer = new SystemContainerBridge(registry);

        // Register all core system definitions
        const definitions = createCoreSystemDefinitions(config, container);
        for (const def of definitions) {
            systemContainer.register(def);
        }

        // Initialize all non-lazy systems
        // This triggers creation and dependency resolution
        for (const def of definitions) {
            if (!def.lazy) {
                systemContainer.get(def.key);
            }
        }
    }

    /**
     * Register custom system definitions
     *
     * This allows extending the factory with custom systems.
     *
     * Example:
     * ```ts
     * const QuestSystem = Symbol('QuestSystem');
     * SystemFactory.registerCustomSystem({
     *   key: QuestSystem,
     *   factory: (c) => new QuestManager(c.get(SYSTEMS.EventBus)),
     *   dependencies: [SYSTEMS.EventBus]
     * });
     * ```
     */
    static customDefinitions: SystemDefinition[] = [];

    static registerCustomSystem(definition: SystemDefinition): void {
        this.customDefinitions.push(definition);
    }
}

/**
 * Bridge between SystemContainer and SystemRegistry
 *
 * This allows us to use SystemContainer's DI features while maintaining
 * backward compatibility with SystemRegistry. Implements ISystemFactoryContext
 * to provide renderer registration alongside system resolution.
 */
class SystemContainerBridge extends SystemContainer implements ISystemFactoryContext {
    constructor(private registry: SystemRegistry) {
        super();
    }

    override register<T>(definition: SystemDefinition<T>): void {
        // Wrap the factory to also register with SystemRegistry
        const originalFactory = definition.factory;
        const wrappedDefinition: SystemDefinition<T> = {
            ...definition,
            factory: (c) => {
                const instance = originalFactory(c);
                // Register with the old registry for backward compatibility
                this.registry.register(definition.key as symbol, instance);
                return instance;
            }
        };

        super.register(wrappedDefinition);
    }

    /**
     * Register a renderer instance
     * Implements ISystemFactoryContext.registerRenderer
     */
    registerRenderer(type: string, renderer: any): void {
        this.registry.registerRenderer(type, renderer);
    }

    /**
     * Get a registered renderer instance
     * Implements ISystemFactoryContext.getRenderer
     */
    getRenderer(type: string): any {
        return this.registry.getRenderer(type);
    }
}