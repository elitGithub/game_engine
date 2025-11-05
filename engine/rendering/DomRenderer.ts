// engine/rendering/DomRenderer.ts

import type { IRenderer, RenderCommand, TextStyleData } from '../types/RenderingTypes';
import { EventBus } from '../core/EventBus';
import { SpriteRenderer } from './SpriteRenderer';
import { TextRenderer } from './TextRenderer';
import { Dialogue } from './Dialogue';
import { DialogueLine } from './DialogueLine';
import { TextStyle as DomTextStyle } from './TextStyle';  // Your existing DOM-specific class

/**
 * DomRenderer - DOM-based implementation of IRenderer.
 *
 * Uses existing SpriteRenderer and TextRenderer to handle commands.
 * Emits events via EventBus for inputs (decoupled).
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
    this.container = container;  // Ensure attached
    this.spriteRenderer.initialize();
    this.textRenderer.initialize();
  }

  clear(): void {
    this.spriteRenderer.clear();
    this.textRenderer.clear();
  }

  flush(commands: RenderCommand[]): void {
    // Sort for layering if needed
    commands.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    commands.forEach(cmd => {
      switch (cmd.type) {
        case 'clear':
          this.clear();
          break;
        case 'image':
        case 'sprite':
          this.spriteRenderer.addSprite(cmd.id, {
            src: cmd.src || cmd.assetId || '',  // Adjust for your asset system
            x: cmd.x,
            y: cmd.y,
            width: cmd.width,
            height: cmd.height,
            zIndex: cmd.zIndex,
          });
          break;
        case 'text':
          // Convert TextStyleData to your existing DomTextStyle
          const domStyle = new DomTextStyle({
            fontFamily: cmd.style.font?.split(' ').slice(1).join(' ') || 'Arial',
            fontSize: cmd.style.font?.split(' ')[0] || '16px',
            fontWeight: cmd.style.bold ? 'bold' : 'normal',
            fontStyle: cmd.style.italic ? 'italic' : 'normal',
            color: cmd.style.color || '#000',
            textAlign: cmd.style.align || 'left',
          });
          this.textRenderer.render(cmd.text, {
            style: domStyle,
          });
          break;
        case 'rect':
          const rectEl = document.createElement('div');
          rectEl.style.position = 'absolute';
          rectEl.style.left = `${cmd.x}px`;
          rectEl.style.top = `${cmd.y}px`;
          rectEl.style.width = `${cmd.width}px`;
          rectEl.style.height = `${cmd.height}px`;
          rectEl.style.backgroundColor = cmd.fill || 'transparent';
          rectEl.style.border = cmd.stroke || 'none';
          rectEl.style.zIndex = `${cmd.zIndex || 0}`;
          this.container.appendChild(rectEl);
          break;
        case 'dialogue':
          const dialogue = new Dialogue(cmd.lines.map(line => new DialogueLine(line.speaker || '', line.text)));
          this.textRenderer.renderSequence(cmd.lines.map(line => ({
            text: line.text,
            options: {
              speaker: line.speaker,
              style: cmd.style,  // Convert to DomTextStyle if needed
              animate: cmd.typewriter,
            }
          })));
          break;
        case 'hotspot':
          this.spriteRenderer.addHotspot(
            cmd.id,
            cmd.x,
            cmd.y,
            cmd.width,
            cmd.height,
            () => this.eventBus.emit(cmd.onClick, { id: cmd.id })
          );
          break;
        default:
          console.warn(`[DomRenderer] Unsupported command type: ${cmd.type}`);
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