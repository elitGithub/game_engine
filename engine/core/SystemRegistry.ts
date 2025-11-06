import type { IRenderer } from "@engine/types/RenderingTypes";
export class SystemRegistry {
     private systems = new Map<symbol, unknown>();
     private renderers = new Map<string, IRenderer>();

    /**
     * Register a system instance
     * @throws Error if system already registered (prevents accidental overwrites)
     */
    register<T>(key: symbol, instance: T): void {
        if (this.systems.has(key)) {
            console.warn(`[SystemRegistry] Overwriting system: ${key.description}`);
        }
        this.systems.set(key, instance);
    }

    /**
     * Get a required system instance with type safety
     * @throws Error if system not found
     */
    get<T>(key: symbol): T {
        const system = this.systems.get(key);
        if (!system) {
            throw new Error(`[SystemRegistry] System not found: ${key.description || 'unknown'}`);
        }
        return system as T;
    }

    /**
     * Register a renderer instance
     */
    registerRenderer(type: string, instance: IRenderer): void {
        if (this.renderers.has(type)) {
            console.warn(`[SystemRegistry] Overwriting renderer: ${type}`);
        }
        this.renderers.set(type, instance);
    }

    /**
     * Get a registered renderer instance
     * @throws Error if renderer not found
     */
    getRenderer(type: string): IRenderer {
        const renderer = this.renderers.get(type);
        if (!renderer) {
            throw new Error(`[SystemRegistry] Renderer not found: ${type}`);
        }
        return renderer;
    }

    /**
     * Get an optional system instance (returns undefined if not found)
     */
    getOptional<T>(key: symbol): T | undefined {
        return this.systems.get(key) as T | undefined;
    }

    /**
     * Check if a system is registered
     */
    has(key: symbol): boolean {
        return this.systems.has(key);
    }

    /**
     * Remove a system from the registry
     */
    unregister(key: symbol): boolean {
        return this.systems.delete(key);
    }

    /**
     * Clear all registered systems
     */
    clear(): void {
        this.systems.clear();
    }
}

/**
 * System keys - Use symbols for unique, collision-free identifiers
 *
 * Symbols ensure no naming conflicts and provide better debugging
 * (symbol.description shows up in error messages)
 */
export const SYSTEMS = {
    EventBus: Symbol('EventBus'),
    AssetManager: Symbol('AssetManager'),
    AudioManager: Symbol('AudioManager'),
    SaveManager: Symbol('SaveManager'),
    StateManager: Symbol('StateManager'),
    SceneManager: Symbol('SceneManager'),
    ActionRegistry: Symbol('ActionRegistry'),
    EffectManager: Symbol('EffectManager'),
    InputManager: Symbol('InputManager'),
    PluginManager: Symbol('PluginManager'),
    RenderManager: Symbol('RenderManager'),
    Localization: Symbol('Localization'),
} as const;

/**
 * Type helper for system keys
 */
export type SystemKey = typeof SYSTEMS[keyof typeof SYSTEMS];