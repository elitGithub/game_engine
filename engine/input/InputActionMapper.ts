// engine/systems/input/InputActionMapper.ts

import type { EventBus } from '@engine/core/EventBus';
import type { InputAction, InputBinding } from '@engine/types/InputEvents';

export class InputActionMapper {
    private readonly eventBus: EventBus;
    private readonly actions: Map<string, InputAction> = new Map();
    private readonly inputIndex: Map<string, Set<string>> = new Map();

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public registerAction(name: string, bindings: InputBinding[]): void {
        this.actions.set(name, { name, bindings });

        // Build index for O(1) lookup
        bindings.forEach(binding => {
            const key = `${binding.type}:${binding.input}`;
            if (!this.inputIndex.has(key)) {
                this.inputIndex.set(key, new Set());
            }
            this.inputIndex.get(key)!.add(name);
        });
    }

    public getActions(): ReadonlyMap<string, InputAction> {
        return this.actions;
    }

    public checkActionTriggers(
        type: string,
        input: string | number,
        modifiers?: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }
    ): void {
        // O(1) lookup using index
        const key = `${type}:${input}`;
        const candidateActions = this.inputIndex.get(key);

        if (!candidateActions) {
            return; // No actions bound to this input
        }

        // Check only the actions bound to this specific input
        candidateActions.forEach(name => {
            const action = this.actions.get(name);
            if (!action) return;

            const triggered = action.bindings.some(binding => {
                if (binding.type !== type) return false;
                if (binding.input !== input) return false;

                // Only check key bindings for modifiers
                if (binding.type === 'key') {
                    // Get the state of modifiers from the event, defaulting to false
                    const eventMods = {
                        shift: modifiers?.shift ?? false,
                        ctrl: modifiers?.ctrl ?? false,
                        alt: modifiers?.alt ?? false,
                        meta: modifiers?.meta ?? false,
                    };

                    // Get the required modifiers from the binding, defaulting to false
                    const bindingMods = {
                        shift: binding.modifiers?.shift ?? false,
                        ctrl: binding.modifiers?.ctrl ?? false,
                        alt: binding.modifiers?.alt ?? false,
                        meta: binding.modifiers?.meta ?? false,
                    };

                    // All modifier states must match *exactly*
                    if (
                        eventMods.shift !== bindingMods.shift ||
                        eventMods.ctrl !== bindingMods.ctrl ||
                        eventMods.alt !== bindingMods.alt ||
                        eventMods.meta !== bindingMods.meta
                    ) {
                        return false; // Mismatch
                    }
                }

                // If we passed all checks, this binding is triggered
                return true;
            });

            if (triggered) {
                this.eventBus.emit('input.action', { action: name });
            }
        });
    }
}