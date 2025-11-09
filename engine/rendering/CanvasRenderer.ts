import type {IRenderer, RenderCommand, TextStyleData} from '@engine/types/RenderingTypes.ts';
// Removed unused EventBus and container imports from constructor
import type {AssetManager} from '@engine/systems/AssetManager.ts';
import type { IRenderContainer } from '../interfaces/IRenderContainer';
import { isCanvasRenderContainer } from '../interfaces/IRenderContainer';

/**
 * CanvasRenderer - Canvas-based "dumb" IRenderer implementation.
 *
 * Renders commands to a 2D canvas context.
 *
 * Requires ICanvasRenderContainer - use with CanvasRenderContainer from platform adapter
 */
export class CanvasRenderer implements IRenderer {
    // FIX: Use definite assignment assertion '!'
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;

    constructor(
        // AssetManager is required to resolve asset IDs
        private assets: AssetManager
    ) {}

    init(container: IRenderContainer): void {
        if (!isCanvasRenderContainer(container)) {
            throw new Error('[CanvasRenderer] Requires ICanvasRenderContainer (Canvas platform)');
        }

        this.canvas = container.getCanvas();
        this.ctx = container.getContext();

        const dimensions = container.getDimensions();
        this.resize(dimensions.width, dimensions.height);
    }

    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    flush(commands: RenderCommand[]): void {
        this.clear();

        // Type-safe helper to get zIndex
        const getZ = (cmd: RenderCommand): number => {
            if (cmd.type === 'clear') return -Infinity;
            return cmd.zIndex || 0;
        }

        // Filter out 'clear' commands
        const renderableCommands = commands.filter(cmd => cmd.type !== 'clear');

        const sortedCommands = renderableCommands.sort((a, b) => getZ(a) - getZ(b));

        for (const cmd of sortedCommands) {
            this.ctx.save();

            // cmd is guaranteed *not* to be { type: 'clear' } here
            switch (cmd.type) {
                case 'image':
                case 'sprite': {
                    const imgAsset = this.assets.get<HTMLImageElement>(cmd.assetId);
                    if (imgAsset) {
                        this.ctx.drawImage(
                            imgAsset,
                            cmd.x,
                            cmd.y,
                            cmd.width || imgAsset.width,
                            cmd.height || imgAsset.height
                        );
                    }
                    break;
                }

                case 'text': {
                    this.applyTextStyle(cmd.style);
                    this.ctx.fillText(cmd.text, cmd.x, cmd.y);
                    break;
                }

                case 'rect': {
                    if (cmd.fill) {
                        this.ctx.fillStyle = cmd.fill;
                        this.ctx.fillRect(cmd.x, cmd.y, cmd.width, cmd.height);
                    }
                    if (cmd.stroke) {
                        this.ctx.strokeStyle = cmd.stroke;
                        this.ctx.strokeRect(cmd.x, cmd.y, cmd.width, cmd.height);
                    }
                    break;
                }

                case 'hotspot': {
                    // No-op. Input is handled by InputManager + GameState
                    break;
                }
            }

            this.ctx.restore();
        }
    }

    private applyTextStyle(style: TextStyleData): void {
        const fontStyle = style.italic ? 'italic' : 'normal';
        const fontWeight = style.bold ? 'bold' : 'normal';
        const fontSize = '16px'; // Default
        const fontFamily = 'Arial'; // Default

        this.ctx.font = style.font || `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;

        if (style.color) this.ctx.fillStyle = style.color;
        if (style.align) this.ctx.textAlign = style.align;
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    dispose(): void {
        this.canvas.remove();
    }
}