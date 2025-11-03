/**
 * ActionRegistry - Central registry for all game actions
 */
import type { ActionContext } from '@types/index';
import { Action } from './Action';

export class ActionRegistry {
    private actions: Map<string, Action>;
    private actionsByType: Map<string, Action[]>;

    constructor() {
        this.actions = new Map();
        this.actionsByType = new Map();
    }

    /**
     * Register an action
     */
    register(action: Action, type: string = 'default'): void {
        this.actions.set(action.id, action);
        
        // Group by type
        if (!this.actionsByType.has(type)) {
            this.actionsByType.set(type, []);
        }
        this.actionsByType.get(type)!.push(action);
        
        console.log(`[ActionRegistry] Registered action: ${action.id} (type: ${type})`);
    }

    /**
     * Get an action by ID
     */
    get(actionId: string): Action | null {
        return this.actions.get(actionId) || null;
    }

    /**
     * Get all actions of a specific type
     */
    getByType(type: string): Action[] {
        return this.actionsByType.get(type) || [];
    }

    /**
     * Get all available actions for current context
     */
    getAvailableActions(type: string, context: ActionContext): Action[] {
        const actions = this.getByType(type);
        return actions.filter(action => action.canExecute(context));
    }

    /**
     * Execute an action by ID
     */
    execute(actionId: string, context: ActionContext): any {
        const action = this.get(actionId);
        if (!action) {
            console.error(`[ActionRegistry] Action '${actionId}' not found`);
            return null;
        }

        if (!action.canExecute(context)) {
            console.warn(`[ActionRegistry] Action '${actionId}' cannot be executed:`, 
                         action.getUnavailableReason(context));
            return null;
        }

        return action.execute(context);
    }
}
