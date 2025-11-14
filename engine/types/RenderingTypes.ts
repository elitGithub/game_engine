// engine/types/RenderingTypes.ts

import type { IRenderContainer } from '@engine/interfaces';

export interface IRenderer {
    init(container: IRenderContainer): void;
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
    customCSS?: Record<string, string>;
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

export interface PositionedMenuItem {
    id: string;
    text: { text: string; x: number; y: number; style: TextStyleData };
    hotspot: { x: number; y: number; width: number; height: number };
    /** Generic data for click handlers */
    data: Record<string, unknown>;
}

export interface PositionedMenu {
    id: string;
    background: { x: number; y: number; width: number; height: number; fill: string };
    title?: { text: string; x: number; y: number; style: TextStyleData };
    items: PositionedMenuItem[];
    zIndex?: number;
}

// -------------------------------------------------------------------
export interface PositionedBar {
    id: string;
    background: { x: number; y: number; width: number; height: number; fill: string };
    foreground: { x: number; y: number; width: number; height: number; fill: string };
    label?: { text: string; x: number; y: number; style: TextStyleData };
    zIndex?: number;
}

export interface TextDisplayData {
    text: string;
    position: { x: number; y: number };
    id?: string;
    style?: TextStyleData;
    zIndex?: number;
}

export interface PositionedChoice {
    id: string; // e.g., 'choice_0'
    text: string;
    textPos: { x: number; y: number };
    hotspot: { x: number; y: number; width: number; height: number };
    /** Generic data for click handlers */
    data: Record<string, unknown>;
    style?: TextStyleData; // Allow custom styling
}

export interface PositionedDialogue {
    id: string;
    background?: { x: number; y: number; width: number; height: number; fill: string };
    speaker?: { text: string; x: number; y: number; style: TextStyleData };
    text: { text: string; x: number; y: number; style: TextStyleData };
    portrait?: { assetId: string; x: number; y: number; width: number; height: number };
    zIndex?: number;
}