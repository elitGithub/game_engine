/**
 * GameState - Base class for all game states
 */
import type { StateData } from '@types/index';

export abstract class GameState {
    public name: string;
    public isActive: boolean;

    constructor(name: string) {
        this.name = name;
        this.isActive = false;
    }

    /**
     * Called when entering this state
     */
    enter(data: StateData = {}): void {
        this.isActive = true;
        console.log(`[State] Entering: ${this.name}`);
    }

    /**
     * Called when exiting this state
     */
    exit(): void {
        this.isActive = false;
        console.log(`[State] Exiting: ${this.name}`);
    }

    /**
     * Update logic (runs every frame or tick)
     */
    update(deltaTime: number): void {
        // Override in subclasses
    }

    /**
     * Render to screen
     */
    render(renderer: any): void {
        // Override in subclasses
    }

    /**
     * Handle user input
     */
    handleInput(input: string): void {
        // Override in subclasses
    }
}
