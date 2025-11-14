/**
 * Canvas Container Implementation
 */


import {IAnimationProvider, ICanvasRenderContainer} from "@engine/interfaces";

export class CanvasRenderContainer implements ICanvasRenderContainer {
    private context: CanvasRenderingContext2D;
    private pendingFrameId?: number;

    constructor(private readonly canvas: HTMLCanvasElement, private animationProvider: IAnimationProvider | null = null) {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.context = ctx;
    }

    getType(): 'canvas' {
        return 'canvas';
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    getContext(): CanvasRenderingContext2D {
        return this.context;
    }

    getDimensions(): { width: number; height: number } {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    setDimensions(width: number, height: number): boolean {
        this.canvas.width = width;
        this.canvas.height = height;
        return true;
    }

    getPixelRatio(): number {
        return this.animationProvider?.getDevicePixelRatio() || 1.0;
    }

    requestAnimationFrame(callback: () => void): () => void {
        const id = this.animationProvider?.requestAnimationFrame(callback);
        this.pendingFrameId = id;
        return () => {
            if (id) {
                this.animationProvider?.cancelAnimationFrame(id);
                this.pendingFrameId = undefined;
            }
        };
    }

    dispose(): void {
        if (this.pendingFrameId) {
            this.animationProvider?.cancelAnimationFrame(this.pendingFrameId);
            this.pendingFrameId = undefined;
        }
    }
}
