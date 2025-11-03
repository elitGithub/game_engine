/**
 * EffectManager - Manages all visual effects
 *
 * Supports 3 types of effects:
 * 1. Static: Applies/removes CSS classes (e.g., 'glitch')
 * 2. Dynamic: Runs code on an element every frame (e.g., 'heartbeat')
 * 3. Global: Runs code globally every frame (e.g., 'x-ray')
 */
import type { GameContext, IDynamicEffect, IGlobalEffect, EffectStep } from '@types/index';
import type { SpriteRenderer } from '../rendering/SpriteRenderer';

// Helper type for active dynamic effects
type ActiveDynamicEffect = {
    name: string;
    logic: IDynamicEffect;
};

export class EffectManager {
    private context: GameContext;
    private container: HTMLElement | null = null;

    // Registries
    private staticEffects: Map<string, string | string[]>;
    private dynamicEffects: Map<string, IDynamicEffect>;
    private globalEffects: Map<string, IGlobalEffect>;

    // Active effect trackers
    private activeDynamicEffects: Map<HTMLElement, ActiveDynamicEffect[]>;
    private activeGlobalEffects: Map<string, IGlobalEffect>;
    private timedEffects: Map<HTMLElement, number[]>; // Stores setTimeout IDs

    constructor(context: GameContext) {
        this.context = context;

        this.staticEffects = new Map();
        this.dynamicEffects = new Map();
        this.globalEffects = new Map();

        this.activeDynamicEffects = new Map();
        this.activeGlobalEffects = new Map();
        this.timedEffects = new Map();
    }

    /**
     * Initializes the manager with the root game container.
     * Required for Global Effects.
     */
    initialize(container: HTMLElement): void {
        this.container = container;
    }

    /**
     * Called by the Engine game loop every frame.
     */
    update(deltaTime: number): void {
        // Update all active dynamic effects
        this.activeDynamicEffects.forEach((effects, element) => {
            effects.forEach(effect => {
                effect.logic.onUpdate(element, this.context, deltaTime);
            });
        });

        // Update all active global effects
        this.activeGlobalEffects.forEach(effect => {
            effect.onUpdate(this.context, deltaTime);
        });
    }

    // --- REGISTRATION ---

    /**
     * Registers a Static (CSS class-based) effect.
     * @param name Friendly name (e.g., 'glitch')
     * @param cssClass CSS class to apply (e.g., 'glitch-effect')
     */
    registerStaticEffect(name: string, cssClass: string | string[]): void {
        this.staticEffects.set(name, cssClass);
    }

    /**
     * Registers a Dynamic (frame-based) effect.
     * @param name Friendly name (e.g., 'heartbeat')
     * @param logic An object implementing IDynamicEffect
     */
    registerDynamicEffect(name: string, logic: IDynamicEffect): void {
        this.dynamicEffects.set(name, logic);
    }

    /**
     * Registers a Global (screen-wide) effect.
     * @param name Friendly name (e.g., 'xray')
     * @param logic An object implementing IGlobalEffect
     */
    registerGlobalEffect(name: string, logic: IGlobalEffect): void {
        this.globalEffects.set(name, logic);
    }

    // --- ELEMENT-BASED EFFECTS ---

    /**
     * Applies a Static or Dynamic effect to a DOM element.
     * @param element The DOM element to affect
     * @param effectName The friendly name of the effect
     * @param duration Optional. If provided, removes effect after X ms.
     * @returns A promise that resolves when the effect is complete (if duration is provided)
     */
    apply(element: HTMLElement, effectName: string, duration?: number): Promise<void> {
        if (!element) return Promise.resolve();

        // Try to apply as Dynamic Effect
        if (this.dynamicEffects.has(effectName)) {
            const logic = this.dynamicEffects.get(effectName)!;

            if (!this.activeDynamicEffects.has(element)) {
                this.activeDynamicEffects.set(element, []);
            }

            // Avoid applying the same effect multiple times
            const existing = this.activeDynamicEffects.get(element)!;
            if (existing.some(e => e.name === effectName)) {
                return Promise.resolve(); // Already active
            }

            logic.onStart(element, this.context);
            existing.push({ name: effectName, logic });

        // Fallback to Static Effect
        } else if (this.staticEffects.has(effectName)) {
            const cssClass = this.staticEffects.get(effectName)!;
            element.classList.add(...(Array.isArray(cssClass) ? cssClass : [cssClass]));

        } else {
            console.warn(`[EffectManager] Effect '${effectName}' not registered.`);
            return Promise.resolve();
        }

        // Handle timed duration
        if (duration) {
            return new Promise(resolve => {
                const timerId = window.setTimeout(() => {
                    this.remove(element, effectName);

                    // Remove timer from map
                    const timers = this.timedEffects.get(element);
                    if (timers) {
                        const index = timers.indexOf(timerId);
                        if (index > -1) timers.splice(index, 1);
                    }
                    resolve();
                }, duration);

                if (!this.timedEffects.has(element)) {
                    this.timedEffects.set(element, []);
                }
                this.timedEffects.get(element)!.push(timerId);
            });
        }

        return Promise.resolve();
    }

    /**
     * Removes a Static or Dynamic effect from a DOM element.
     * @param element The DOM element to affect
     * @param effectName The friendly name of the effect
     */
    remove(element: HTMLElement, effectName: string): void {
        if (!element) return;

        // Try to remove Dynamic Effect
        if (this.dynamicEffects.has(effectName)) {
            const active = this.activeDynamicEffects.get(element);
            if (active) {
                const effectIndex = active.findIndex(e => e.name === effectName);
                if (effectIndex > -1) {
                    const [removedEffect] = active.splice(effectIndex, 1);
                    removedEffect.logic.onStop(element, this.context);
                }
                if (active.length === 0) {
                    this.activeDynamicEffects.delete(element);
                }
            }

        // Fallback to Static Effect
        } else if (this.staticEffects.has(effectName)) {
            const cssClass = this.staticEffects.get(effectName)!;
            element.classList.remove(...(Array.isArray(cssClass) ? cssClass : [cssClass]));
        }
    }

    /**
     * Helper method to find a sprite by ID and apply an effect.
     */
    applyToSprite(spriteId: string, effectName: string, duration?: number): Promise<void> {
        const renderer = this.context.renderer as SpriteRenderer;
        if (renderer && typeof renderer.getSprite === 'function') {
            const spriteElement = renderer.getSprite(spriteId);
            if (spriteElement) {
                return this.apply(spriteElement, effectName, duration);
            } else {
                console.warn(`[EffectManager] Sprite '${spriteId}' not found in renderer.`);
            }
        } else {
            console.error(`[EffectManager] context.renderer is not a valid SpriteRenderer.`);
        }
        return Promise.resolve();
    }

    /**
     * Runs a sequence of effects on an element.
     * @param element The DOM element
     * @param steps An array of EffectStep objects
     */
    async sequence(element: HTMLElement, steps: EffectStep[]): Promise<void> {
        for (const step of steps) {
            if ('wait' in step) {
                await new Promise(r => setTimeout(r, step.wait));
            } else {
                // 'name' and 'duration' are in step
                await this.apply(element, step.name, step.duration);
            }
        }
    }

    // --- GLOBAL EFFECTS ---

    /**
     * Starts a Global screen-wide effect.
     * @param effectName The friendly name of the effect
     */
    startGlobalEffect(effectName: string): void {
        if (!this.container) {
            console.error(`[EffectManager] Must call initialize(container) before using global effects.`);
            return;
        }
        if (this.activeGlobalEffects.has(effectName)) return;

        const logic = this.globalEffects.get(effectName);
        if (logic) {
            logic.onCreate(this.container, this.context);
            this.activeGlobalEffects.set(effectName, logic);
        } else {
            console.warn(`[EffectManager] Global effect '${effectName}' not registered.`);
        }
    }

    /**
     * Stops a Global screen-wide effect.
     * @param effectName The friendly name of the effect
     */
    stopGlobalEffect(effectName: string): void {
        const logic = this.activeGlobalEffects.get(effectName);
        if (logic) {
            logic.onDestroy(this.context);
            this.activeGlobalEffects.delete(effectName);
        }
    }

    /**
     * Stops all running effects (e.g., for scene cleanup).
     */
    stopAllEffects(): void {
        // Stop all dynamic effects
        this.activeDynamicEffects.forEach((effects, element) => {
            effects.forEach(effect => {
                effect.logic.onStop(element, this.context);
            });
        });
        this.activeDynamicEffects.clear();

        // Stop all global effects
        this.activeGlobalEffects.forEach(effect => {
            effect.onDestroy(this.context);
        });
        this.activeGlobalEffects.clear();

        // Clear all pending timers
        this.timedEffects.forEach(timers => {
            timers.forEach(clearTimeout);
        });
        this.timedEffects.clear();
    }
}