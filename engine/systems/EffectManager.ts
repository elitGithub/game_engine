import type { GameContext, EffectStep } from '@engine/types';
import type { IEffectTarget, IDynamicEffect } from '@engine/types/EffectTypes';
import type { ITimerProvider } from '@engine/interfaces';
import {ILogger} from "@engine/interfaces/ILogger";

type ActiveDynamicEffect = {
    name: string;
    logic: IDynamicEffect;
    target: IEffectTarget; // Store the target
};

export class EffectManager {
    private timer: ITimerProvider;
    private logger: ILogger;

    // Registries
    private staticEffects: Map<string, string | string[]>; // DOM-only
    private dynamicEffects: Map<string, IDynamicEffect>; // Generic

    // Active effect trackers
    // Use target.id as the key
    private activeDynamicEffects: Map<string, ActiveDynamicEffect[]>;
    private timedEffects: Map<string, unknown[]>; // Keyed by target.id

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
            effects.forEach(effect => {
                effect.logic.onUpdate(effect.target, context, deltaTime, this.logger);
            });
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

        const targetId = target.id;

        if (this.dynamicEffects.has(effectName)) {
            const logic = this.dynamicEffects.get(effectName)!;

            if (!this.activeDynamicEffects.has(targetId)) {
                this.activeDynamicEffects.set(targetId, []);
            }

            const existing = this.activeDynamicEffects.get(targetId)!;
            if (existing.some(e => e.name === effectName)) {
                return Promise.resolve(); // Effect already active
            }

            logic.onStart(target, context, this.logger);
            existing.push({ name: effectName, logic, target });

        } else if (this.staticEffects.has(effectName)) {
            const cssClass = this.staticEffects.get(effectName)!;
            if (target.addClass) {
                const classes = Array.isArray(cssClass) ? cssClass : [cssClass];
                classes.forEach(c => target.addClass!(c));
            } else {
                this.logger.warn(`[EffectManager] Static effect '${effectName}' not supported by target '${target.id}'.`);
            }

        } else {
            this.logger.warn(`[EffectManager] Effect '${effectName}' not registered.`);
            return Promise.resolve();
        }

        if (duration) {
            return new Promise(resolve => {
                const timerId = this.timer.setTimeout(() => {
                    this.remove(target, effectName, context);

                    const timers = this.timedEffects.get(targetId);
                    if (timers) {
                        const index = timers.indexOf(timerId);
                        if (index > -1) timers.splice(index, 1);
                    }
                    resolve();
                }, duration);

                if (!this.timedEffects.has(targetId)) {
                    this.timedEffects.set(targetId, []);
                }
                this.timedEffects.get(targetId)!.push(timerId);
            });
        }

        return Promise.resolve();
    }

    remove(target: IEffectTarget, effectName: string, context: GameContext): void {
        if (!target) return;
        const targetId = target.id;

        if (this.dynamicEffects.has(effectName)) {
            const active = this.activeDynamicEffects.get(targetId);
            if (active) {
                const effectIndex = active.findIndex(e => e.name === effectName);
                if (effectIndex > -1) {
                    const [removedEffect] = active.splice(effectIndex, 1);
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