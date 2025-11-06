// engine/types/RenderingTypes.ts

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
    /** Generic data for click handlers - engine doesn't interpret this */
    data?: Record<string, unknown>;
    zIndex?: number;
};

/**
 * MenuItem - Defines a menu button
 * GameState provides these to UIRenderer for rendering
 */
export interface MenuItem {
    label: string;
    /** Generic data passed to click handlers */
    data?: Record<string, unknown>;
    id?: string;
}

export interface MenuData {
    title?: string;
    items: MenuItem[];
    id?: string;
    layout: {
        x: number;
        y: number;
        width: number;
        height: number;
        padding?: number;
    };
    style?: {
        backgroundColor?: string;
        titleStyle?: TextStyleData;
        itemStyle?: TextStyleData;
    };
}

export interface BarData {
    current: number;
    max: number;
    position: { x: number; y: number };
    size: { width: number; height: number };
    id?: string;
    colors?: {
        background?: string;
        foreground?: string;
        text?: string;
    };
    label?: string;
    zIndex?: number;
}

export interface TextDisplayData {
    text: string;
    position: { x: number; y: number };
    id?: string;
    style?: TextStyleData;
    zIndex?: number;
}