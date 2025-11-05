import type { GameContext, EffectStep } from '@engine/types';
import type { IEffectTarget, IDynamicEffect, IGlobalEffect } from '@engine/types/EffectTypes';

type ActiveDynamicEffect = {
    name: string;
    logic: IDynamicEffect;
    target: IEffectTarget; // Store the target
};

export class EffectManager {
    private container: HTMLElement;

    // Registries
    private staticEffects: Map<string, string | string[]>; // DOM-only
    private dynamicEffects: Map<string, IDynamicEffect>; // Generic
    private globalEffects: Map<string, IGlobalEffect>; // Generic

    // Active effect trackers
    // Use target.id as the key
    private activeDynamicEffects: Map<string, ActiveDynamicEffect[]>;
    private activeGlobalEffects: Map<string, IGlobalEffect>;
    private timedEffects: Map<string, number[]>; // Keyed by target.id

    constructor(container: HTMLElement) {
        this.container = container;

        this.staticEffects = new Map();
        this.dynamicEffects = new Map();
        this.globalEffects = new Map();

        this.activeDynamicEffects = new Map();
        this.activeGlobalEffects = new Map();
        this.timedEffects = new Map();
    }

    update(deltaTime: number, context: GameContext): void {
        this.activeDynamicEffects.forEach((effects) => {
            effects.forEach(effect => {
                effect.logic.onUpdate(effect.target, context, deltaTime);
            });
        });

        this.activeGlobalEffects.forEach(effect => {
            effect.onUpdate(context, deltaTime);
        });
    }

    // --- REGISTRATION ---

    registerStaticEffect(name: string, cssClass: string | string[]): void {
        this.staticEffects.set(name, cssClass);
    }

    registerDynamicEffect(name: string, logic: IDynamicEffect): void {
        this.dynamicEffects.set(name, logic);
    }

    registerGlobalEffect(name: string, logic: IGlobalEffect): void {
        this.globalEffects.set(name, logic);
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

            logic.onStart(target, context);
            existing.push({ name: effectName, logic, target });

        } else if (this.staticEffects.has(effectName)) {
            // Static effects are DOM-ONLY. We must check the target.
            const element = target.getRaw() as HTMLElement;
            if (element && typeof element.classList === 'object') {
                const cssClass = this.staticEffects.get(effectName)!;
                element.classList.add(...(Array.isArray(cssClass) ? cssClass : [cssClass]));
            } else {
                console.warn(`[EffectManager] Static effect '${effectName}' can only be applied to DOM targets.`);
            }

        } else {
            console.warn(`[EffectManager] Effect '${effectName}' not registered.`);
            return Promise.resolve();
        }

        if (duration) {
            return new Promise(resolve => {
                const timerId = window.setTimeout(() => {
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
                    removedEffect.logic.onStop(target, context);
                }
                if (active.length === 0) {
                    this.activeDynamicEffects.delete(targetId);
                }
            }

        } else if (this.staticEffects.has(effectName)) {
            const element = target.getRaw() as HTMLElement;
             if (element && typeof element.classList === 'object') {
                const cssClass = this.staticEffects.get(effectName)!;
                element.classList.remove(...(Array.isArray(cssClass) ? cssClass : [cssClass]));
            }
        }
    }

    async sequence(target: IEffectTarget, steps: EffectStep[], context: GameContext): Promise<void> {
        for (const step of steps) {
            if ('wait' in step) {
                await new Promise(r => setTimeout(r, step.wait));
            } else {
                await this.apply(target, step.name, context, step.duration);
            }
        }
    }

    // --- GLOBAL EFFECTS ---
    // (No changes needed for start/stop GlobalEffect)
    startGlobalEffect(effectName: string, context: GameContext): void {
        if (this.activeGlobalEffects.has(effectName)) return;

        const logic = this.globalEffects.get(effectName);
        if (logic) {
            logic.onCreate(this.container, context);
            this.activeGlobalEffects.set(effectName, logic);
        } else {
            console.warn(`[EffectManager] Global effect '${effectName}' not registered.`);
        }
    }

    stopGlobalEffect(effectName: string, context: GameContext): void {
        const logic = this.activeGlobalEffects.get(effectName);
        if (logic) {
            logic.onDestroy(context);
            this.activeGlobalEffects.delete(effectName);
        }
    }

    stopAllEffects(context: GameContext): void {
        this.activeDynamicEffects.forEach((effects) => {
            effects.forEach(effect => {
                effect.logic.onStop(effect.target, context);
            });
        });
        this.activeDynamicEffects.clear();

        this.activeGlobalEffects.forEach(effect => {
            effect.onDestroy(context);
        });
        this.activeGlobalEffects.clear();

        this.timedEffects.forEach(timers => {
            timers.forEach(clearTimeout);
        });
        this.timedEffects.clear();
    }

    dispose(context: GameContext): void {
        this.stopAllEffects(context);

        this.staticEffects.clear();
        this.dynamicEffects.clear();
        this.globalEffects.clear();
        this.activeDynamicEffects.clear();
        this.activeGlobalEffects.clear();
        this.timedEffects.clear();
    }
}