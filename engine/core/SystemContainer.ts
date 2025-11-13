/**
 * SystemContainer - Dependency Injection Container for Game Engine
 *
 * Provides:
 * - Dependency declaration and resolution
 * - Lazy-loading of optional systems
 * - Extensible system registration
 * - Lifecycle management (initialize, dispose)
 */
import type {ILogger} from "@engine/interfaces/ILogger";

/**
 * System key must be a symbol to prevent key collisions.
 * For serialization keys (SaveManager), use string keys separately via registerSerializableSystem()
 */
export type SystemKey = symbol;

/**
 * Lifecycle stages for system initialization
 */
export enum SystemLifecycle {
    REGISTERED = 'registered',     // System definition is registered
    INSTANTIATED = 'instantiated', // System instance created
    INITIALIZED = 'initialized',   // System initialized (dependencies resolved)
    READY = 'ready',              // System fully configured and ready to use
    DISPOSED = 'disposed'          // System disposed
}

/**
 * System factory context interface
 *
 * This interface defines the contract for the container passed to factory functions.
 * It includes system resolution and OPTIONAL renderer registration methods.
 *
 * Renderer methods are optional because:
 * - Not all systems need renderer access
 * - Base SystemContainer doesn't have renderer methods
 * - SystemContainerBridge adds renderer methods for RenderManager
 */
export interface ISystemFactoryContext {
    /** Get a required system instance */
    get<T>(key: SystemKey): T;

    /** Get an optional system instance */
    getOptional<T>(key: SystemKey): T | undefined;

    /** Check if a system is registered */
    has(key: SystemKey): boolean;

    /**
     * Register a renderer (optional - provided by SystemContainerBridge)
     * Required for RenderManager initialization
     */
    registerRenderer?(type: string, renderer: any): void;

    /**
     * Get a registered renderer (optional - provided by SystemContainerBridge)
     * Required for RenderManager initialization
     */
    getRenderer?(type: string): any;
}

/**
 * System definition - describes how to create and configure a system
 */
export interface SystemDefinition<T = any> {
    /** Unique key for this system */
    key: SystemKey;

    /** Factory function to create the system instance */
    factory: (container: ISystemFactoryContext) => T;

    /** Dependencies that must be available before this system can be created */
    dependencies?: SystemKey[];

    /** Whether this system should be lazy-loaded (created on first access) */
    lazy?: boolean;

    /** Optional initialization callback after dependencies are resolved */
    initialize?: (system: T, container: ISystemFactoryContext) => void | Promise<void>;

    /** Optional dispose callback for cleanup */
    dispose?: (system: T) => void | Promise<void>;
}

/**
 * System instance metadata
 */
interface SystemEntry<T = any> {
    definition: SystemDefinition<T>;
    instance?: T;
    lifecycle: SystemLifecycle;
    initPromise?: Promise<void>;
}

/**
 * Dependency Injection Container for game engine systems
 *
 * Implements ISystemFactoryContext to provide system resolution.
 * Renderer methods are optional and added by SystemContainerBridge.
 */
export class SystemContainer implements ISystemFactoryContext {
    private systems: Map<SystemKey, SystemEntry> = new Map();
    private initializing: Set<SystemKey> = new Set();
    private logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Register a system definition in the container.
     * If a system with the same key is already registered, it will be overwritten with a warning.
     *
     * @template T - The type of the system instance
     * @param definition - The system definition describing how to create and configure the system
     */
    register<T>(definition: SystemDefinition<T>): void {
        if (this.systems.has(definition.key)) {
            this.logger.warn(`[SystemContainer] System '${String(definition.key)}' already registered. Overwriting.`);
        }

        this.systems.set(definition.key, {
            definition,
            lifecycle: SystemLifecycle.REGISTERED
        });
    }

    /**
     * Register an already-instantiated system (for backward compatibility)
     */
    registerInstance<T>(key: SystemKey, instance: T): void {
        this.systems.set(key, {
            definition: {
                key,
                factory: () => instance
            },
            instance,
            lifecycle: SystemLifecycle.READY
        });
    }

    /**
     * Check if a system is registered
     */
    has(key: SystemKey): boolean {
        return this.systems.has(key);
    }

    /**
     * Get a system instance from the container.
     * If the system has not been instantiated yet, it will be created and initialized automatically.
     * Dependencies will be resolved recursively.
     *
     * @template T - The type of the system instance
     * @param key - The unique key identifying the system
     * @returns The system instance
     * @throws Error if the system is not registered or if a circular dependency is detected
     */
    get<T>(key: SystemKey): T {
        const entry = this.systems.get(key);

        if (!entry) {
            throw new Error(`[SystemContainer] System '${String(key)}' not found. Did you forget to register it?`);
        }

        // If already instantiated, return it
        if (entry.instance) {
            return entry.instance as T;
        }

        // Create and initialize the system
        return this.createSystem<T>(entry);
    }

    /**
     * Get an optional system (returns undefined if not registered)
     */
    getOptional<T>(key: SystemKey): T | undefined {
        if (!this.has(key)) {
            return undefined;
        }
        return this.get<T>(key);
    }

    /**
     * Create a system instance and resolve its dependencies
     */
    private createSystem<T>(entry: SystemEntry<T>): T {
        const { definition } = entry;

        // Check for circular dependencies
        if (this.initializing.has(definition.key)) {
            throw new Error(
                `[SystemContainer] Circular dependency detected for system '${String(definition.key)}'`
            );
        }

        this.initializing.add(definition.key);

        try {
            // Ensure all dependencies are available
            if (definition.dependencies) {
                for (const depKey of definition.dependencies) {
                    if (!this.systems.has(depKey)) {
                        throw new Error(
                            `[SystemContainer] Dependency '${String(depKey)}' not found for system '${String(definition.key)}'`
                        );
                    }
                    // Recursively create dependencies
                    this.get(depKey);
                }
            }

            // Create the instance
            const instance = definition.factory(this);
            entry.instance = instance;
            entry.lifecycle = SystemLifecycle.INSTANTIATED;

            // Call initialize if defined
            if (definition.initialize) {
                const initResult = definition.initialize(instance, this);
                if (initResult instanceof Promise) {
                    entry.initPromise = initResult.then(() => {
                        entry.lifecycle = SystemLifecycle.READY;
                    });
                } else {
                    entry.lifecycle = SystemLifecycle.READY;
                }
            } else {
                entry.lifecycle = SystemLifecycle.READY;
            }

            return instance;
        } finally {
            this.initializing.delete(definition.key);
        }
    }

    /**
     * Initialize all registered non-lazy systems
     */
    async initializeAll(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const [key, entry] of this.systems.entries()) {
            // Skip lazy systems
            if (entry.definition.lazy) {
                continue;
            }

            // Create the system if not already created
            if (!entry.instance) {
                this.get(key);
            }

            // Wait for initialization if it's async
            if (entry.initPromise) {
                promises.push(entry.initPromise);
            }
        }

        await Promise.all(promises);
    }

    /**
     * Dispose of a specific system and clean up its resources.
     * Calls the system's dispose callback if defined, then marks the system as disposed.
     *
     * @param key - The unique key identifying the system to dispose
     */
    async dispose(key: SystemKey): Promise<void> {
        const entry = this.systems.get(key);

        if (!entry || !entry.instance) {
            return;
        }

        if (entry.definition.dispose) {
            await entry.definition.dispose(entry.instance);
        }

        entry.instance = undefined;
        entry.lifecycle = SystemLifecycle.DISPOSED;
    }

    /**
     * Dispose of all systems
     */
    async disposeAll(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const key of this.systems.keys()) {
            promises.push(this.dispose(key));
        }

        await Promise.all(promises);
    }

    /**
     * Clear all system registrations
     */
    clear(): void {
        this.systems.clear();
        this.initializing.clear();
    }

    /**
     * Get lifecycle state of a system
     */
    getLifecycleState(key: SystemKey): SystemLifecycle | undefined {
        return this.systems.get(key)?.lifecycle;
    }

    /**
     * Get all registered system keys
     */
    getRegisteredKeys(): SystemKey[] {
        return Array.from(this.systems.keys());
    }
}
