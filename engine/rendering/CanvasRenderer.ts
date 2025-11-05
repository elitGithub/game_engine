import type {IRenderer, RenderCommand} from "@engine/types/RenderingTypes.ts";

export class CanvasRenderer implements IRenderer {
    init(container: HTMLElement): void {
        throw new Error("Method not implemented.");
    }
    clear(): void {
        throw new Error("Method not implemented.");
    }
    flush(commands: RenderCommand[]): void {
        throw new Error("Method not implemented.");
    }
    resize(width: number, height: number): void {
        throw new Error("Method not implemented.");
    }
    dispose(): void {
        throw new Error("Method not implemented.");
    }

}