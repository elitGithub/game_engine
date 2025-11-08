// engine/tests/PlatformContainer.test.ts

// FIX: Removed unused 'vi' import
import { describe, it, expect } from 'vitest';
import { BrowserContainer, NativeContainer, HeadlessContainer } from '@engine/core/PlatformContainer';

describe('PlatformContainer', () => {
    describe('BrowserContainer', () => {
        it('should return the DOM element and dimensions', () => {
            const mockEl = { clientWidth: 800, clientHeight: 600 } as HTMLElement;
            const container = new BrowserContainer(mockEl);

            expect(container.getDomElement()).toBe(mockEl);
            expect(container.getDimensions()).toEqual({ width: 800, height: 600 });
        });

        it('should return canvas element if it is one', () => {
            const mockCanvas = document.createElement('canvas');
            const container = new BrowserContainer(mockCanvas);
            expect(container.getCanvasElement()).toBe(mockCanvas);
        });

        it('should return undefined for canvas if not a canvas', () => {
            const mockEl = document.createElement('div');
            const container = new BrowserContainer(mockEl);
            expect(container.getCanvasElement()).toBeUndefined();
        });
    });

    describe('NativeContainer', () => {
        it('should return the native view and dimensions', () => {
            const mockView = { id: 'nativeView', width: 1080, height: 1920 };
            const container = new NativeContainer(mockView);

            expect(container.getNativeView()).toBe(mockView);
            expect(container.getDimensions()).toEqual({ width: 1080, height: 1920 });

            // FIX: Use the 'in' operator to test for property non-existence
            expect('getDomElement' in container).toBe(false);
            expect('getCanvasElement' in container).toBe(false);
        });
    });

    describe('HeadlessContainer', () => {
        it('should return dimensions and no view', () => {
            const container = new HeadlessContainer(1024, 768);

            expect(container.getDimensions()).toEqual({ width: 1024, height: 768 });

            // FIX: Use the 'in' operator to test for property non-existence
            expect('getDomElement' in container).toBe(false);
            expect('getNativeView' in container).toBe(false);
            expect('getCanvasElement' in container).toBe(false);
        });
    });
});