// engine/rendering/DomEffectTarget.ts
import type { IEffectTarget } from '@engine/types/EffectTypes';

/**
 * Wraps a DOM HTMLElement to be used by the EffectManager.
 */
export class DomEffectTarget implements IEffectTarget {
    constructor(private element: HTMLElement) {}

    get id(): string {
        return this.element.id;
    }

    getProperty<T>(name: string): T | undefined {
        switch (name) {
            case 'textContent':
                return this.element.textContent as T;
            case 'opacity':
                return parseFloat(this.element.style.opacity || '1') as T;
            // Add more properties as needed (e.g., parsing 'transform')
            default:
                return undefined;
        }
    }

    setProperty<T>(name: string, value: T): void {
        switch (name) {
            case 'textContent':
                this.element.textContent = value as string;
                break;
            case 'opacity':
                this.element.style.opacity = `${value}`;
                break;
            // Add more properties as needed
        }
    }

    getRaw(): any {
        return this.element;
    }
}