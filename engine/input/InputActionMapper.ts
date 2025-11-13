// engine/systems/input/InputActionMapper.ts

import type { EventBus } from '@engine/core/EventBus';
import type { InputAction, InputBinding } from '@engine/types/InputEvents';

export class InputActionMapper {
    private eventBus: EventBus;
    private actions: Map<string, InputAction> = new Map();

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public registerAction(name: string, bindings: InputBinding[]): void {
        this.actions.set(name, { name, bindings });
    }

    public getActions(): Map<string, InputAction> {
        return this.actions;
    }

    public checkActionTriggers(
        type: string,
        input: string | number,
        modifiers?: { shift: boolean; ctrl: boolean; alt: boolean; meta: boolean }
    ): void {
        this.actions.forEach((action, name) => {
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