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

/**
 * Defines the contract for a menu button.
 * Your GameState can create an array of these
 * to be rendered by the UIRenderer.
 */
export interface MenuItem {
    /** The text to display on the button */
    label: string;
    /** The action string for the 'hotspot' command */
    action: string;
    /** Optional: unique ID for the render command */
    id?: string;
}

/**
 * Defines the data structure for a generic menu.
 */
export interface MenuData {
    title?: string;
    items: MenuItem[];
    /** Optional: A unique ID for the menu background */
    id?: string;
    /** Position and size of the menu */
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

/**
 * Defines the data structure for a health/resource bar.
 * Your GameState extracts values from its own player/entity
 * and passes this pure data to UIRenderer.
 */
export interface BarData {
    /** Current value (e.g., current health) */
    current: number;
    /** Maximum value (e.g., max health) */
    max: number;
    /** Position on screen */
    position: { x: number; y: number };
    /** Size of the bar */
    size: { width: number; height: number };
    /** Optional: unique ID for the render commands */
    id?: string;
    /** Optional: custom colors */
    colors?: {
        background?: string;
        foreground?: string;
        text?: string;
    };
    /** Optional: display text (if not provided, shows "current / max") */
    label?: string;
    /** Optional: z-index override */
    zIndex?: number;
}

/**
 * Defines the data structure for a text display element.
 */
export interface TextDisplayData {
    /** The text to display */
    text: string;
    /** Position on screen */
    position: { x: number; y: number };
    /** Optional: unique ID */
    id?: string;
    /** Optional: text style */
    style?: TextStyleData;
    /** Optional: z-index override */
    zIndex?: number;
}