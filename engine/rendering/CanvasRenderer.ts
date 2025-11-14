import type {IRenderer, RenderCommand, TextStyleData} from '@engine/types/RenderingTypes';
// Removed unused EventBus and container imports from constructor
import type {AssetManager} from '@engine/systems/AssetManager';
import type {ILogger, IRenderContainer} from '@engine/interfaces';
import {isCanvasRenderContainer} from '@engine/interfaces';

/**
 * CanvasRenderer - Canvas-based "dumb" IRenderer implementation.
 *
 * Renders commands to a 2D canvas context.
 *
 * Requires ICanvasRenderContainer - use with CanvasRenderContainer from platform adapter
 */
export class CanvasRenderer implements IRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private fontStringCache: Map<string, string> = new Map();

    constructor(
        private readonly assets: AssetManager,
        private readonly logger: ILogger
    ) {
    }

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
        if (!this.ctx || !this.canvas) {
            return;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    flush(commands: RenderCommand[]): void {
        if (!this.ctx) {
            return;
        }
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
                    } else {
                        this.logger.warn(`[CanvasRenderer] Asset '${cmd.assetId}' not found`);
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
        if (!this.ctx) return;

        // Build font string from semantic properties
        const fontStyle = style.fontStyle || 'normal';
        const fontWeight = style.fontWeight || 'normal';
        const fontSize = style.fontSize || '16px';
        const fontFamily = style.fontFamily || 'Arial';

        // Build cache key from all font properties
        const cacheKey = `${fontStyle}|${fontWeight}|${fontSize}|${fontFamily}`;

        // Check cache first to avoid string allocation
        let fontString = this.fontStringCache.get(cacheKey);
        if (!fontString) {
            // Cache miss - generate and store
            fontString = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
            this.fontStringCache.set(cacheKey, fontString);
        }

        this.ctx.font = fontString;

        // Apply color and alignment
        if (style.color) this.ctx.fillStyle = style.color;
        if (style.textAlign) this.ctx.textAlign = style.textAlign;
    }

    resize(width: number, height: number): void {
        if (!this.canvas) return;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    dispose(): void {
        if (!this.canvas) return;
        this.canvas.remove();
    }
}