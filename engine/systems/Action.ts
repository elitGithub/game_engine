/**
 * Action - Base class for all player actions
 */
import type { ActionContext } from '@types/index';

export abstract class Action {
    public id: string;
    public name: string;
    public description: string;

    constructor(id: string, name: string, description: string = '') {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    /**
     * Check if this action can be executed right now
     */
    canExecute(context: ActionContext): boolean {
        return true;
    }

    /**
     * Execute the action
     */
    abstract execute(context: ActionContext): any;

    /**
     * Get a reason why this action can't be executed
     */
    getUnavailableReason(context: ActionContext): string {
        return this.canExecute(context) ? '' : 'Action not available';
    }
}
