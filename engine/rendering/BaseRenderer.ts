/**
 * BaseRenderer - Abstract base class for all renderers
 */
export abstract class BaseRenderer {
    protected container: HTMLElement;
    protected isReady: boolean;

    constructor(containerElement: HTMLElement) {
        this.container = containerElement;
        this.isReady = false;
    }

    /**
     * Initialize the renderer
     */
    async initialize(): Promise<void> {
        this.isReady = true;
    }

    /**
     * Clear all rendered content
     */
    abstract clear(): void;

    /**
     * Render content with optional metadata
     * Can return void, Promise<void>, or any value for specialized renderers
     */
    abstract render(content: any, options?: any): void | Promise<void> | Promise<any>;

    /**
     * Clean up resources
     */
    dispose(): void {
        this.isReady = false;
    }
}