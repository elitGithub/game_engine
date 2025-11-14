// engine/types/EffectTypes.ts

import type { TypedGameContext } from './CoreTypes';
import type { ILogger } from '@engine/interfaces/ILogger';

/**
 * EffectTypes - Types for the effect animation system
 *
 * This file contains types related to:
 * - Effect sequences and timing
 * - Animation step definitions
 * - Effect target abstraction
 * - Dynamic effect interface
 */

/**
 * EffectStep - Single step in an effect animation sequence
 *
 * Effect sequences are composed of steps that either:
 * - Execute a named effect with a duration
 * - Wait for a specified amount of time
 *
 * Steps are executed sequentially by the EffectManager. This allows
 * for complex multi-step animations like:
 * - Fade out, wait, fade in
 * - Shake screen, flash, play sound
 * - Zoom in, rotate, zoom out
 *
 * @example
 * ```typescript
 * const flashSequence: EffectStep[] = [
 *   { name: 'fadeOut', duration: 100 },  // Fade to black over 100ms
 *   { wait: 50 },                        // Hold for 50ms
 *   { name: 'fadeIn', duration: 100 }    // Fade back in over 100ms
 * ];
 *
 * effectManager.playSequence(flashSequence, context);
 * ```
 *
 * @example
 * ```typescript
 * const damageEffect: EffectStep[] = [
 *   { name: 'shake', duration: 200 },    // Shake for 200ms
 *   { name: 'flash', duration: 100 },    // Flash red for 100ms
 *   { wait: 300 }                        // Wait before continuing
 * ];
 * ```
 */
export type EffectStep =
    | {
        /**
         * Name of the effect to execute
         *
         * Must match a registered effect name in EffectManager
         */
        name: string;

        /**
         * Duration of the effect in milliseconds
         */
        duration: number;
    }
    | {
        /**
         * Wait time in milliseconds before next step
         */
        wait: number;
    };

/**
 * IEffectTarget - Platform-agnostic wrapper for effect targets
 *
 * This interface provides a generic abstraction over any object that can be
 * animated by the EffectManager. Different renderers (DOM, Canvas) implement
 * this interface to expose their animatable elements in a consistent way.
 *
 * The EffectManager works exclusively with IEffectTarget, never directly with
 * platform-specific types like HTMLElement. This maintains the engine's
 * platform-agnostic design.
 *
 * @example
 * ```typescript
 * // DOM implementation
 * class DomEffectTarget implements IEffectTarget {
 *   constructor(private element: HTMLElement) {}
 *
 *   get id() { return this.element.id; }
 *
 *   getProperty<T>(name: string): T | undefined {
 *     return this.element.style[name] as T;
 *   }
 *
 *   setProperty<T>(name: string, value: T): void {
 *     this.element.style[name] = value as string;
 *   }
 * }
 * ```
 */
export interface IEffectTarget {
    /**
     * Unique identifier for tracking this target
     *
     * Used by EffectManager to correlate effects with targets
     */
    readonly id: string;

    /**
     * Get an animatable property value from the target
     *
     * Property names are platform-agnostic (e.g., 'opacity', 'x', 'y').
     * The implementation translates these to platform-specific equivalents.
     *
     * @param name - Property name to retrieve
     * @returns Current value of the property, or undefined if not found
     *
     * @example
     * ```typescript
     * const opacity = target.getProperty<number>('opacity'); // Returns 0-1
     * const x = target.getProperty<number>('x'); // Returns x position
     * ```
     */
    getProperty<T>(name: string): T | undefined;

    /**
     * Set an animatable property value on the target
     *
     * Property names are platform-agnostic (e.g., 'opacity', 'x', 'y').
     * The implementation translates these to platform-specific equivalents.
     *
     * @param name - Property name to set
     * @param value - New value for the property
     *
     * @example
     * ```typescript
     * target.setProperty('opacity', 0.5);
     * target.setProperty('x', 100);
     * target.setProperty('textContent', 'Hello World');
     * ```
     */
    setProperty<T>(name: string, value: T): void;

    /**
     * Get the underlying platform-specific object
     *
     * For effects that need direct access to the raw renderer object.
     * Avoid using this when possible; prefer getProperty/setProperty.
     *
     * @returns The raw object (HTMLElement, Canvas context, etc.)
     *
     * @example
     * ```typescript
     * const element = target.getRaw() as HTMLElement;
     * element.classList.add('special-effect');
     * ```
     */
    getRaw(): HTMLElement | unknown;

    /**
     * Add a CSS class to the target (optional, DOM-specific)
     *
     * Only implemented by DOM-based targets. Used for static CSS effects.
     *
     * @param className - CSS class name to add
     */
    addClass?(className: string): void;

    /**
     * Remove a CSS class from the target (optional, DOM-specific)
     *
     * Only implemented by DOM-based targets. Used for static CSS effects.
     *
     * @param className - CSS class name to remove
     */
    removeClass?(className: string): void;
}

/**
 * IDynamicEffect - Interface for programmable effects
 *
 * Dynamic effects are effects implemented in code rather than CSS.
 * They have explicit lifecycle hooks for animation logic and work with
 * the abstract IEffectTarget interface for platform independence.
 *
 * Common use cases:
 * - Typewriter text reveal
 * - Complex particle systems
 * - Physics-based animations
 * - Procedural animations
 *
 * @typeParam TGame - Game-specific state interface
 *
 * @example
 * ```typescript
 * class FadeEffect implements IDynamicEffect {
 *   private startOpacity = 1;
 *   private targetOpacity = 0;
 *   private elapsed = 0;
 *   private duration = 1000;
 *
 *   onStart(target: IEffectTarget) {
 *     this.startOpacity = target.getProperty<number>('opacity') || 1;
 *     this.elapsed = 0;
 *   }
 *
 *   onUpdate(target: IEffectTarget, context, deltaTime) {
 *     this.elapsed += deltaTime;
 *     const progress = Math.min(this.elapsed / this.duration, 1);
 *     const opacity = this.startOpacity + (this.targetOpacity - this.startOpacity) * progress;
 *     target.setProperty('opacity', opacity);
 *   }
 *
 *   onStop(target: IEffectTarget) {
 *     target.setProperty('opacity', this.targetOpacity);
 *   }
 * }
 * ```
 */
export interface IDynamicEffect<TGame = Record<string, unknown>> {
    /**
     * Called when the effect starts
     *
     * Initialize effect state, record starting values, set up resources.
     *
     * @param target - The target to animate
     * @param context - Game context for accessing systems
     * @param logger - Logger for debugging
     */
    onStart(target: IEffectTarget, context: TypedGameContext<TGame>, logger: ILogger): void;

    /**
     * Called every frame while the effect is running
     *
     * Update animation state and modify target properties.
     *
     * @param target - The target to animate
     * @param context - Game context for accessing systems
     * @param deltaTime - Time elapsed since last frame in milliseconds
     * @param logger - Logger for debugging
     */
    onUpdate(target: IEffectTarget, context: TypedGameContext<TGame>, deltaTime: number, logger: ILogger): void;

    /**
     * Called when the effect stops
     *
     * Clean up resources, reset state, ensure target is in final state.
     *
     * @param target - The target that was animated
     * @param context - Game context for accessing systems
     * @param logger - Logger for debugging
     */
    onStop(target: IEffectTarget, context: TypedGameContext<TGame>, logger: ILogger): void;
}
