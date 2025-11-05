// engine/rendering/DomRenderer.ts

import type {IRenderer, RenderCommand} from '../types/RenderingTypes';
import {EventBus} from '../core/EventBus';
import {SpriteRenderer} from './SpriteRenderer';
import {TextRenderer} from './TextRenderer';
import {TextStyle as DomTextStyle} from './TextStyle'; // Existing DOM-specific class

/**
 * DomRenderer - DOM-based IRenderer impl.
 *
 * Bridges RenderCommand to existing Sprite/TextRenderer.
 * Converts TextStyleData → DomTextStyle internally.
 * Emits to EventBus for decoupled input (e.g., hotspots).
 */
export class DomRenderer implements IRenderer {
    private container: HTMLElement;
    private eventBus: EventBus;
    private spriteRenderer: SpriteRenderer;
    private textRenderer: TextRenderer;

    constructor(container: HTMLElement, eventBus: EventBus) {
        this.container = container;
        this.eventBus = eventBus;
        this.spriteRenderer = new SpriteRenderer(container);
        this.textRenderer = new TextRenderer(container);
    }

    init(container: HTMLElement): void {
        this.container = container;
        this.spriteRenderer.initialize();
        this.textRenderer.initialize();
    }

    clear(): void {
        this.spriteRenderer.clear();
        this.textRenderer.clear();
    }

    flush(commands: RenderCommand[]): void {
        // Filter for sortable (commands with zIndex)
        const sortableCommands = commands.filter((cmd): cmd is Extract<RenderCommand, {
            zIndex?: number
        }> => 'zIndex' in cmd && cmd.zIndex !== undefined);
        sortableCommands.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const allCommands = commands.filter(cmd => !sortableCommands.includes(cmd)).concat(sortableCommands);

        allCommands.forEach(cmd => {
            switch (cmd.type) {
                case 'clear':
                    this.clear();
                    break;
                case 'image':
                case 'sprite':
                    this.spriteRenderer.addSprite(cmd.id, {
                        src: cmd.assetId,  // Assume assetId resolves to URL; bridge AssetManager if needed
                        x: cmd.x,
                        y: cmd.y,
                        width: cmd.width,
                        height: cmd.height,
                        zIndex: cmd.zIndex,
                    });
                    break;
                case 'text':
                    const domStyle = new DomTextStyle({
                        fontFamily: cmd.style.font?.split(' ').slice(1).join(' ') || 'Arial',
                        fontSize: cmd.style.font?.split(' ')[0] || '16px',
                        fontWeight: cmd.style.bold ? 'bold' : 'normal',
                        fontStyle: cmd.style.italic ? 'italic' : 'normal',
                        color: cmd.style.color || '#000',
                        textAlign: cmd.style.align || 'left',
                    });
                    this.textRenderer.render(cmd.text, {style: domStyle});
                    break;
                case 'rect':
                    const rectEl = document.createElement('div');
                    rectEl.style.position = 'absolute';
                    rectEl.style.left = `${cmd.x}px`;
                    rectEl.style.top = `${cmd.y}px`;
                    rectEl.style.width = `${cmd.width}px`;
                    rectEl.style.height = `${cmd.height}px`;
                    rectEl.style.backgroundColor = cmd.fill || 'transparent';
                    rectEl.style.border = cmd.stroke ? `1px solid ${cmd.stroke}` : 'none';
                    if (cmd.zIndex !== undefined) rectEl.style.zIndex = `${cmd.zIndex}`;
                    this.container.appendChild(rectEl);
                    break;
                case 'dialogue':
                    const dialogueDomStyle = new DomTextStyle({
                        fontSize: cmd.style?.font?.split(' ')[0] || '1rem',
                        color: cmd.style?.color || '#fbbf24',
                        textAlign: cmd.style?.align || 'left',
                        fontWeight: cmd.style?.bold ? 'bold' : 'normal',
                        fontStyle: cmd.style?.italic ? 'italic' : 'normal',
                    });
                    cmd.lines.forEach(line => {
                        this.textRenderer.renderDialogue(line.speaker || '', line.text, {
                            style: dialogueDomStyle,
                            animate: cmd.typewriter,
                        });
                    });
                    break;
// DomRenderer.flush() — hotspot case
                case 'hotspot':
                    const hotspotEl = document.createElement('div');
                    hotspotEl.id = cmd.id;
                    hotspotEl.style.position = 'absolute';
                    hotspotEl.style.left = `${cmd.x}px`;
                    hotspotEl.style.top = `${cmd.y}px`;
                    hotspotEl.style.width = `${cmd.width}px`;
                    hotspotEl.style.height = `${cmd.height}px`;
                    hotspotEl.style.cursor = 'pointer';
                    if (cmd.zIndex !== undefined) hotspotEl.style.zIndex = `${cmd.zIndex}`;

                    hotspotEl.addEventListener('click', (e: MouseEvent) => {
                        this.eventBus.emit('input.click', {
                            type: 'click',
                            timestamp: Date.now(),
                            button: e.button,
                            x: e.clientX,
                            y: e.clientY,
                            target: e.target,
                        });
                    });

                    this.container.appendChild(hotspotEl);
                    break;
                default:
                    // Exhaustive check - TS happy
                    console.warn(`Unsupported command type: ${cmd}`);
            }
        });
    }

    resize(width: number, height: number): void {
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;
    }

    dispose(): void {
        this.spriteRenderer.dispose();
        this.textRenderer.dispose();
        this.container.innerHTML = '';
    }
}