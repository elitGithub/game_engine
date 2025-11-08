// engine/tests/DomEffectTarget.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { DomEffectTarget } from '@engine/rendering/DomEffectTarget';

describe('DomEffectTarget', () => {
    let element: HTMLElement;
    let target: DomEffectTarget;

    beforeEach(() => {
        element = document.createElement('div');
        element.id = 'test-el';
        target = new DomEffectTarget(element);
    });

    it('should get the id', () => {
        expect(target.id).toBe('test-el');
    });

    it('should get the raw element', () => {
        expect(target.getRaw()).toBe(element);
    });

    it('should get and set textContent', () => {
        expect(target.getProperty('textContent')).toBe('');
        target.setProperty('textContent', 'Hello');
        expect(element.textContent).toBe('Hello');
        expect(target.getProperty('textContent')).toBe('Hello');
    });

    it('should get and set opacity', () => {
        expect(target.getProperty('opacity')).toBe(1); // Default
        target.setProperty('opacity', 0.5);
        expect(element.style.opacity).toBe('0.5');
        expect(target.getProperty('opacity')).toBe(0.5);
    });

    it('should return undefined for unknown property', () => {
        expect(target.getProperty('foo')).toBeUndefined();
    });
});