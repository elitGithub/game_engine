// engine/rendering/CanvasEffectTarget.ts
import type { IEffectTarget } from '@engine/types/EffectTypes';
import type { RenderCommand, TextStyleData } from '@engine/types/RenderingTypes';

// Define the specific union of commands that can be animated
type AnimatableCommand = Extract<RenderCommand, { type: 'sprite' | 'image' | 'text' | 'rect' }>;

/**
 * Wraps a Canvas RenderCommand to be used by the EffectManager.
 * Note: This modifies the command object directly.
 */
export class CanvasEffectTarget implements IEffectTarget {

    constructor(private command: AnimatableCommand) {}

    get id(): string {
        return this.command.id;
    }

    getProperty<T>(name: string): T | undefined {
        // Properties common to ALL animatable commands
        switch (name) {
            case 'x':
                return this.command.x as T;
            case 'y':
                return this.command.y as T;
        }

        // Properties specific to *some* commands.
        if (this.command.type === 'rect' || this.command.type === 'sprite' || this.command.type === 'image') {
            switch (name) {
                case 'width':
                    return this.command.width as T;
                case 'height':
                    return this.command.height as T;
            }
        }

        if (this.command.type === 'text') {
             switch (name) {
                case 'text':
                    return this.command.text as T;
                case 'style':
                    return this.command.style as T;
            }
        }

        return undefined;
    }

    setProperty<T>(name: string, value: T): void {
        // Properties common to ALL animatable commands
        switch (name) {
            case 'x':
                this.command.x = value as number;
                return;
            case 'y':
                this.command.y = value as number;
                return;
        }

        // Properties specific to *some* commands.
        if (this.command.type === 'rect' || this.command.type === 'sprite' || this.command.type === 'image') {
            switch (name) {
                case 'width':
                    this.command.width = value as number;
                    return;
                case 'height':
                    this.command.height = value as number;
                    return;
            }
        }

        if (this.command.type === 'text') {
             switch (name) {
                case 'text':
                    this.command.text = value as string;
                    return;
                case 'style':
                    this.command.style = value as TextStyleData;
                    return;
            }
        }
    }

    getRaw(): any {
        return this.command;
    }
}