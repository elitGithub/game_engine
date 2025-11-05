export interface IRenderer {
  init(container: HTMLElement): void;
  clear(): void;
  flush(commands: RenderCommand[]): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface TextStyleData {
  font?: string;           // e.g., "16px Arial"
  color?: string;          // e.g., "#fff"
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export type RenderCommand =
  | { type: 'clear' }
  | {
      type: 'image' | 'sprite';
      id: string;
      assetId: string;           // Reference to AssetManager
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
      type: 'dialogue';
      id: string;
      lines: { speaker?: string; text: string }[];
      x: number;
      y: number;
      style?: TextStyleData;
      typewriter?: boolean;
      zIndex?: number;
    }
  | {
      type: 'hotspot';
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      onClick: 'input.click';  // keyof EngineEventMap
      zIndex?: number;
    };