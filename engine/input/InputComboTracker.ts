// engine/systems/input/InputComboTracker.ts

import type { EventBus } from '@engine/core/EventBus';
import type { InputCombo } from '@engine/core/InputEvents';
import type { ITimerProvider } from '@engine/interfaces/ITimerProvider';

interface BufferedInput {
    input: string;
    timestamp: number;
}

export class InputComboTracker {
    private eventBus: EventBus;
    private timer: ITimerProvider;
    private combos: Map<string, InputCombo> = new Map();
    private inputBuffer: BufferedInput[] = [];
    private readonly bufferSize: number;

    constructor(eventBus: EventBus, timer: ITimerProvider, bufferSize: number = 10) {
        this.eventBus = eventBus;
        this.timer = timer;
        this.bufferSize = bufferSize;
    }

    public registerCombo(name: string, inputs: string[], timeWindow: number = 1000): void {
        this.combos.set(name, { inputs, timeWindow });
    }

    public addToBuffer(input: string, timestamp: number): void {
        this.inputBuffer.push({
            input,
            timestamp
        });

        if (this.inputBuffer.length > this.bufferSize) {
            this.inputBuffer.shift();
        }
    }

    public checkCombos(): void {
        this.combos.forEach((combo, name) => {
            if (this.isComboTriggered(combo)) {
                this.eventBus.emit('input.combo', { combo: name });
            }
        });
    }

    private isComboTriggered(combo: InputCombo): boolean {
        if (this.inputBuffer.length < combo.inputs.length) return false;

        const recent = this.inputBuffer.slice(-combo.inputs.length);
        const now = this.timer.now();

        return combo.inputs.every((input, i) => {
            const buffered = recent[i];
            return buffered.input === input && (now - buffered.timestamp) <= combo.timeWindow;
        });
    }

    public getInputBuffer(): string[] {
        return this.inputBuffer.map(b => b.input);
    }

    public clearBuffer(): void {
        this.inputBuffer = [];
    }
}