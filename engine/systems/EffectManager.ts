import type { GameContext, EffectStep } from '@engine/types';
import type { IEffectTarget, IDynamicEffect } from '@engine/types/EffectTypes';
import type { ITimerProvider } from '@engine/interfaces';
import type {ILogger} from "@engine/interfaces/ILogger";

type ActiveDynamicEffect = {
    name: string;
    logic: IDynamicEffect;
    target: IEffectTarget; // Store the target
    isDead?: boolean; // Track removed effects to prevent zombie execution
};

export class EffectManager {
    private timer: ITimerProvider;
    private readonly logger: ILogger;

    // Registries
    private readonly staticEffects: Map<string, string | string[]>; // DOM-only
    private readonly dynamicEffects: Map<string, IDynamicEffect>; // Generic

    // Active effect trackers
    // Use target.id as the key
    private readonly activeDynamicEffects: Map<string, ActiveDynamicEffect[]>;
    private readonly timedEffects: Map<string, unknown[]>; // Keyed by target.id

    constructor(timerProvider: ITimerProvider, logger: ILogger) {
        this.timer = timerProvider;
        this.logger = logger;

        this.staticEffects = new Map();
        this.dynamicEffects = new Map();

        this.activeDynamicEffects = new Map();
        this.timedEffects = new Map();
    }

    update(deltaTime: number, context: GameContext): void {
        this.activeDynamicEffects.forEach((effects) => {
            // Iterate backwards to safely handle self-removal during update
            // This avoids array cloning which causes GC pressure in effect-heavy games
            // Reverse iteration is safe because:
            // - Removing current element doesn't affect already-visited indices
            // - Adding new effects appends to end (doesn't affect current iteration)
            for (let i = effects.length - 1; i >= 0; i--) {
                const effect = effects[i];

                // Skip zombie effects (removed during this loop iteration)
                if (effect.isDead) continue;

                effect.logic.onUpdate(effect.target, context, deltaTime, this.logger);
            }
        });
    }

    // --- REGISTRATION ---

    registerStaticEffect(name: string, cssClass: string | string[]): void {
        this.staticEffects.set(name, cssClass);
    }

    registerDynamicEffect(name: string, logic: IDynamicEffect): void {
        this.dynamicEffects.set(name, logic);
    }

    // --- ELEMENT-BASED EFFECTS ---

    /**
     * Applies an effect to a generic, abstract target.
     * The caller is responsible for creating the IEffectTarget.
     */
    apply(target: IEffectTarget, effectName: string, context: GameContext, duration?: number): Promise<void> {
        if (!target) return Promise.resolve();

        if (this.dynamicEffects.has(effectName)) {
            this.applyDynamicEffect(target, effectName, context);
        } else if (this.staticEffects.has(effectName)) {
            this.applyStaticEffect(target, effectName);
        } else {
            this.logger.warn(`[EffectManager] Effect '${effectName}' not registered.`);
            return Promise.resolve();
        }

        return duration
            ? this.applyEffectWithDuration(target, effectName, context, duration)
            : Promise.resolve();
    }

    private applyDynamicEffect(target: IEffectTarget, effectName: string, context: GameContext): void {
        const targetId = target.id;
        const logic = this.dynamicEffects.get(effectName)!;

        if (!this.activeDynamicEffects.has(targetId)) {
            this.activeDynamicEffects.set(targetId, []);
        }

        const existing = this.activeDynamicEffects.get(targetId)!;
        if (existing.some(e => e.name === effectName)) {
            return; // Effect already active
        }

        logic.onStart(target, context, this.logger);
        existing.push({ name: effectName, logic, target });
    }

    private applyStaticEffect(target: IEffectTarget, effectName: string): void {
        const cssClass = this.staticEffects.get(effectName)!;
        if (target.addClass) {
            const classes = Array.isArray(cssClass) ? cssClass : [cssClass];
            classes.forEach(c => target.addClass!(c));
        } else {
            this.logger.warn(`[EffectManager] Static effect '${effectName}' not supported by target '${target.id}'.`);
        }
    }

    private applyEffectWithDuration(
        target: IEffectTarget,
        effectName: string,
        context: GameContext,
        duration: number
    ): Promise<void> {
        const targetId = target.id;

        return new Promise(resolve => {
            const timerId = this.timer.setTimeout(() => {
                this.remove(target, effectName, context);
                this.removeTimerEntry(targetId, timerId);
                resolve();
            }, duration);

            this.addTimerEntry(targetId, timerId);
        });
    }

    private addTimerEntry(targetId: string, timerId: unknown): void {
        if (!this.timedEffects.has(targetId)) {
            this.timedEffects.set(targetId, []);
        }
        this.timedEffects.get(targetId)!.push(timerId);
    }

    private removeTimerEntry(targetId: string, timerId: unknown): void {
        const timers = this.timedEffects.get(targetId);
        if (timers) {
            const index = timers.indexOf(timerId);
            if (index > -1) timers.splice(index, 1);
        }
    }

    remove(target: IEffectTarget, effectName: string, context: GameContext): void {
        if (!target) return;
        const targetId = target.id;

        if (this.dynamicEffects.has(effectName)) {
            const active = this.activeDynamicEffects.get(targetId);
            if (active) {
                const effectIndex = active.findIndex(e => e.name === effectName);
                if (effectIndex > -1) {
                    const removedEffect = active[effectIndex];

                    // Mark as dead BEFORE calling onStop (prevents zombie execution if onStop triggers update)
                    removedEffect.isDead = true;

                    // Remove from array
                    active.splice(effectIndex, 1);

                    // Call lifecycle hook
                    removedEffect.logic.onStop(target, context, this.logger);
                }
                if (active.length === 0) {
                    this.activeDynamicEffects.delete(targetId);
                }
            }

        } else if (this.staticEffects.has(effectName)) {
            if (target.removeClass) {
                const cssClass = this.staticEffects.get(effectName)!;
                const classes = Array.isArray(cssClass) ? cssClass : [cssClass];
                classes.forEach(c => target.removeClass!(c));
            }
        }
    }

    /**
     * Remove all effects from a specific target and clean up all associated resources.
     * IMPORTANT: Call this when removing a target (e.g., DOM element) from your scene
     * to prevent memory leaks.
     *
     * @param target - The target to clean up
     * @param context - The game context
     */
    removeAllEffectsFromTarget(target: IEffectTarget, context: GameContext): void {
        if (!target) return;
        const targetId = target.id;

        // Clean up dynamic effects
        const active = this.activeDynamicEffects.get(targetId);
        if (active) {
            // Mark all as dead and call onStop
            active.forEach(effect => {
                effect.isDead = true;
                effect.logic.onStop(target, context, this.logger);
            });
            this.activeDynamicEffects.delete(targetId);
        }

        // Clean up timed effects
        const timers = this.timedEffects.get(targetId);
        if (timers) {
            timers.forEach(id => this.timer.clearTimeout(id));
            this.timedEffects.delete(targetId);
        }

        // Note: Static effects (CSS classes) should be cleaned up by removing the DOM element itself
    }

    /**
     * Get the number of targets currently tracked by the effect manager.
     * Useful for debugging memory leaks.
     *
     * @returns Object with counts of active dynamic effects and timed effects
     */
    getActiveTargetCount(): { dynamicEffects: number; timedEffects: number } {
        return {
            dynamicEffects: this.activeDynamicEffects.size,
            timedEffects: this.timedEffects.size
        };
    }

    /**
     * Get all currently tracked target IDs.
     * Useful for debugging to see which targets haven't been cleaned up.
     *
     * @returns Array of active target IDs
     */
    getActiveTargetIds(): string[] {
        const dynamicIds = Array.from(this.activeDynamicEffects.keys());
        const timedIds = Array.from(this.timedEffects.keys());
        // Combine and dedupe
        return [...new Set([...dynamicIds, ...timedIds])];
    }

    async sequence(target: IEffectTarget, steps: EffectStep[], context: GameContext): Promise<void> {
        for (const step of steps) {
            if ('wait' in step) {
                await new Promise<void>(r => this.timer.setTimeout(() => r(), step.wait));
            } else {
                await this.apply(target, step.name, context, step.duration);
            }
        }
    }

    stopAllEffects(context: GameContext): void {
        this.activeDynamicEffects.forEach((effects) => {
            effects.forEach(effect => {
                effect.logic.onStop(effect.target, context, this.logger);
            });
        });
        this.activeDynamicEffects.clear();

        this.timedEffects.forEach(timers => {
            timers.forEach(id => this.timer.clearTimeout(id));
        });
        this.timedEffects.clear();
    }

    dispose(context: GameContext): void {
        this.stopAllEffects(context);

        this.staticEffects.clear();
        this.dynamicEffects.clear();
        this.activeDynamicEffects.clear();
        this.timedEffects.clear();
    }
}