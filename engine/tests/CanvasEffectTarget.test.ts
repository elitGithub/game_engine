// engine/tests/CanvasEffectTarget.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasEffectTarget } from '@engine/rendering/CanvasEffectTarget';
// FIX: Import TextStyleData
import type { RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';

// FIX: Define the specific types we will test against
type TestSpriteCommand = Extract<RenderCommand, { type: 'sprite' }>;
type TestTextCommand = Extract<RenderCommand, { type: 'text' }>;

describe('CanvasEffectTarget', () => {
    // NOTE: 'command' and 'target' are now declared inside the nested blocks.

    describe('Sprite Command', () => {
        // FIX: Declare with the *specific* type
        let command: TestSpriteCommand;
        let target: CanvasEffectTarget;

        beforeEach(() => {
            command = {
                type: 'sprite',
                id: 'sprite1',
                assetId: 'img',
                x: 10,
                y: 20,
                width: 100,
                height: 100
            };
            target = new CanvasEffectTarget(command);
        });

        it('should get common properties', () => {
            expect(target.id).toBe('sprite1');
            expect(target.getProperty('x')).toBe(10);
            expect(target.getProperty('y')).toBe(20);
        });

        it('should get sprite-specific properties', () => {
            expect(target.getProperty('width')).toBe(100);
            expect(target.getProperty('height')).toBe(100);
        });

        it('should set common properties', () => {
            target.setProperty('x', 50);
            // FIX: 'command' is now correctly typed as TestSpriteCommand
            expect(command.x).toBe(50);
        });

        it('should set sprite-specific properties', () => {
            target.setProperty('width', 200);
            // FIX: 'command' is now correctly typed as TestSpriteCommand
            expect(command.width).toBe(200);
        });
    });

    describe('Text Command', () => {
        // FIX: Declare with the *specific* type
        let command: TestTextCommand;
        let target: CanvasEffectTarget;
        // FIX: Define the style object
        const style: TextStyleData = { color: 'white' };

        beforeEach(() => {
            command = {
                type: 'text',
                id: 'text1',
                text: 'Hello',
                x: 10,
                y: 20,
                style: style
            };
            target = new CanvasEffectTarget(command);
        });

        it('should get text-specific properties', () => {
            expect(target.getProperty('text')).toBe('Hello');
            expect(target.getProperty('style')).toBe(style);
        });

        it('should set text-specific properties', () => {
            target.setProperty('text', 'World');
            // FIX: 'command' is now correctly typed as TestTextCommand
            expect(command.text).toBe('World');
        });

        it('should not get properties from other types', () => {
            // This test is valid and checks the implementation
            expect(target.getProperty('width')).toBeUndefined();
        });
    });
});