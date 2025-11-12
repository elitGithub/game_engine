/**
 * ActionRegistry - Central registry for all game actions
 */
import type {ActionContext} from '@engine/types';
import {Action} from '@engine/systems/Action';
import {ILogger} from "@engine/interfaces";

export class ActionRegistry<TGame = Record<string, unknown>> {
    private actions: Map<string, Action<TGame>>;
    private actionsByType: Map<string, Action<TGame>[]>;

    constructor(private logger: ILogger) {
        this.actions = new Map();
        this.actionsByType = new Map();
    }

    /**
     * Register an action
     */
    register(action: Action<TGame>, type: string = 'default'): void {
        this.actions.set(action.id, action);

        // Group by type
        if (!this.actionsByType.has(type)) {
            this.actionsByType.set(type, []);
        }
        this.actionsByType.get(type)!.push(action);

        this.logger.log(`[ActionRegistry] Registered action: ${action.id} (type: ${type})`);
    }

    /**
     * Get an action by ID
     */
    get(actionId: string): Action<TGame> | null {
        return this.actions.get(actionId) || null;
    }

    /**
     * Get all actions of a specific type
     */
    getByType(type: string): Action<TGame>[] {
        return this.actionsByType.get(type) || [];
    }

    /**
     * Get all available actions for current context
     */
    getAvailableActions(type: string, context: ActionContext<TGame>): Action<TGame>[] {
        const actions = this.getByType(type);
        return actions.filter(action => action.canExecute(context));
    }

    /**
     * Execute an action by ID
     */
    execute(actionId: string, context: ActionContext<TGame>): unknown {
        const action = this.get(actionId);
        if (!action) {
            this.logger.error(`[ActionRegistry] Action '${actionId}' not found`);
            return null;
        }

        if (!action.canExecute(context)) {
            this.logger.warn(`[ActionRegistry] Action '${actionId}' cannot be executed:`,
                action.getUnavailableReason(context));
            return null;
        }

        return action.execute(context);
    }
}
