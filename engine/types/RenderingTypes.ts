export interface IRenderer {
  init(container: HTMLElement): void;
  clear(): void;
  flush(commands: RenderCommand[]): void;
  resize?(width: number, height: number): void;
  dispose(): void;
}

export interface TextStyleData {
  font?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export type RenderCommand =
  | { type: 'clear' }
  | {
      type: 'image';
      id: string;
      assetId: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill';
      zIndex?: number;
    }
  | {
      type: 'sprite';
      id: string;
      assetId: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      zIndex?: number;
    }
  | {
      type: 'text';
      id: string;
      text: string;
      x: number;
      y: number;
      style: TextStyleData;
      zIndex?: number;
    }
  | {
      /** Renders a simple colored rectangle */
      type: 'rect';
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      fill?: string;
      stroke?: string;
      zIndex?: number;
    }
  | {
      type: 'hotspot';
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      action: string;
      zIndex?: number;
    };

