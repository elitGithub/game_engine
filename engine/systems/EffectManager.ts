// engine/systems/EffectManager.ts
import type { GameContext, IDynamicEffect, IGlobalEffect, EffectStep } from '@engine/types';
import type { SpriteRenderer } from '../rendering/SpriteRenderer';

type ActiveDynamicEffect = {
    name: string;
    logic: IDynamicEffect;
};

export class EffectManager {
    private container: HTMLElement;

    // Registries
    private staticEffects: Map<string, string | string[]>;
    private dynamicEffects: Map<string, IDynamicEffect>;
    private globalEffects: Map<string, IGlobalEffect>;

    // Active effect trackers
    private activeDynamicEffects: Map<HTMLElement, ActiveDynamicEffect[]>;
    private activeGlobalEffects: Map<string, IGlobalEffect>;
    private timedEffects: Map<HTMLElement, number[]>;

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
        this.activeDynamicEffects.forEach((effects, element) => {
            effects.forEach(effect => {
                effect.logic.onUpdate(element, context, deltaTime);
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

    apply(element: HTMLElement, effectName: string, context: GameContext, duration?: number): Promise<void> {
        if (!element) return Promise.resolve();

        if (this.dynamicEffects.has(effectName)) {
            const logic = this.dynamicEffects.get(effectName)!;

            if (!this.activeDynamicEffects.has(element)) {
                this.activeDynamicEffects.set(element, []);
            }

            const existing = this.activeDynamicEffects.get(element)!;
            if (existing.some(e => e.name === effectName)) {
                return Promise.resolve();
            }

            logic.onStart(element, context);
            existing.push({ name: effectName, logic });

        } else if (this.staticEffects.has(effectName)) {
            const cssClass = this.staticEffects.get(effectName)!;
            element.classList.add(...(Array.isArray(cssClass) ? cssClass : [cssClass]));

        } else {
            console.warn(`[EffectManager] Effect '${effectName}' not registered.`);
            return Promise.resolve();
        }

        if (duration) {
            return new Promise(resolve => {
                const timerId = window.setTimeout(() => {
                    this.remove(element, effectName, context);

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

    remove(element: HTMLElement, effectName: string, context: GameContext): void {
        if (!element) return;

        if (this.dynamicEffects.has(effectName)) {
            const active = this.activeDynamicEffects.get(element);
            if (active) {
                const effectIndex = active.findIndex(e => e.name === effectName);
                if (effectIndex > -1) {
                    const [removedEffect] = active.splice(effectIndex, 1);
                    removedEffect.logic.onStop(element, context);
                }
                if (active.length === 0) {
                    this.activeDynamicEffects.delete(element);
                }
            }

        } else if (this.staticEffects.has(effectName)) {
            const cssClass = this.staticEffects.get(effectName)!;
            element.classList.remove(...(Array.isArray(cssClass) ? cssClass : [cssClass]));
        }
    }

    applyToSprite(spriteId: string, effectName: string, context: GameContext, duration?: number): Promise<void> {
        const renderer = context.renderer as SpriteRenderer;
        if (renderer && typeof renderer.getSprite === 'function') {
            const spriteElement = renderer.getSprite(spriteId);
            if (spriteElement) {
                return this.apply(spriteElement, effectName, context, duration);
            } else {
                console.warn(`[EffectManager] Sprite '${spriteId}' not found in renderer.`);
            }
        } else {
            console.warn(`[EffectManager] Renderer lacks sprite support.`);
        }
        return Promise.resolve();
    }

    async sequence(element: HTMLElement, steps: EffectStep[], context: GameContext): Promise<void> {
        for (const step of steps) {
            if ('wait' in step) {
                await new Promise(r => setTimeout(r, step.wait));
            } else {
                await this.apply(element, step.name, context, step.duration);
            }
        }
    }

    // --- GLOBAL EFFECTS ---

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
        this.activeDynamicEffects.forEach((effects, element) => {
            effects.forEach(effect => {
                effect.logic.onStop(element, context);
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