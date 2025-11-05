// engine/types/EffectTypes.ts
import type { GameContext } from './index';

/**
 * A generic, renderer-agnostic wrapper for any object
 * that can be targeted by the EffectManager.
 *
 * This allows a DOM element or a Canvas RenderCommand
 * to be treated the same way.
 */
export interface IEffectTarget {
    /**
     * A unique ID for tracking (e.g., element ID or command ID)
     */
    readonly id: string;

    /**
     * Gets a animatable property from the target.
     * @param name e.g., 'x', 'y', 'opacity', 'textContent'
     */
    getProperty<T>(name: string): T | undefined;

    /**
     * Sets a property on the target.
     * @param name e.g., 'x', 'y', 'opacity', 'textContent'
     * @param value The new value
     */
    setProperty<T>(name: string, value: T): void;

    /**
     * Gets the raw underlying renderable object
     * (e.g., HTMLElement, RenderCommand) for effects
     * that need renderer-specific logic.
     */
    getRaw(): any;
}

/**
 * The refactored, truly generic interface for a dynamic effect.
 * It now operates on an abstract IEffectTarget, not a concrete HTMLElement.
 */
export interface IDynamicEffect {
    onStart(target: IEffectTarget, context: GameContext<any>): void;
    onUpdate(target: IEffectTarget, context: GameContext<any>, deltaTime: number): void;
    onStop(target: IEffectTarget, context: GameContext<any>): void;
}

/**
 * The refactored interface for a global effect.
 */
export interface IGlobalEffect {
    onCreate(container: HTMLElement, context: GameContext<any>): void; // Container is still DOM
    onUpdate(context: GameContext<any>, deltaTime: number): void;
    onDestroy(context: GameContext<any>): void;
}