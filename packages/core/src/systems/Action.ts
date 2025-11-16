/**
 * Action - Base class for all player actions
 */
import type { ActionContext } from '@game-engine/core/types';

export abstract class Action<TGame = Record<string, unknown>> {
    public readonly id: string;
    public readonly name: string;
    public readonly description: string;

    constructor(id: string, name: string, description: string = '') {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    /**
     * Check if this action can be executed right now
     */
    canExecute(_context: ActionContext<TGame>): boolean {
        return true;
    }

    /**
     * Execute the action
     */
    abstract execute(context: ActionContext<TGame>): unknown;

    /**
     * Get a reason why this action can't be executed
     */
    getUnavailableReason(context: ActionContext<TGame>): string {
        return this.canExecute(context) ? '' : 'Action not available';
    }
}
