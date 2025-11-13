/**
 * Rendering Z-Index Constants
 *
 * Defines the default z-index layering for rendering system.
 * These constants provide a clear, documented hierarchy for visual elements.
 *
 * Usage:
 * ```typescript
 * import { DEFAULT_Z_INDEX } from '@engine/constants/RenderingConstants';
 *
 * const myRect = {
 *   x: 10, y: 10,
 *   zIndex: DEFAULT_Z_INDEX.UI_BARS
 * };
 * ```
 *
 * Z-Index Hierarchy (bottom to top):
 * - WORLD (0): World-space scene elements
 * - BACKGROUND (1000): Scene backgrounds and backdrops
 * - SPRITES (5000): Character sprites and scene objects
 * - UI_BARS (10000): HUD elements like health bars, progress bars
 * - UI_MENUS (20000): Modal menus, pause screens, settings
 * - OVERLAY (30000): Fullscreen overlays, transitions, loading screens
 * - DEBUG (100000): Debug visualization, inspector UI
 *
 * Step 1 Philosophy:
 * These are sensible DEFAULTS, not enforced constraints. Developers can
 * override any z-index value explicitly. The constants simply make the
 * layering system visible and self-documenting.
 */
export const DEFAULT_Z_INDEX = {
    /**
     * World-space scene elements (backgrounds, scene sprites)
     */
    WORLD: 0,

    /**
     * Scene background layers
     */
    BACKGROUND: 1000,

    /**
     * Character sprites and scene objects
     */
    SPRITES: 5000,

    /**
     * UI bars (health, mana, experience, loading progress)
     */
    UI_BARS: 10000,

    /**
     * UI menus (pause, settings, inventory)
     */
    UI_MENUS: 20000,

    /**
     * Dialogue and text overlays
     */
    UI_DIALOGUE: 15000,

    /**
     * Fullscreen overlays (transitions, loading screens)
     */
    OVERLAY: 30000,

    /**
     * Debug visualization and inspector UI
     */
    DEBUG: 100000,
} as const;

/**
 * Type-safe z-index constant keys
 */
export type ZIndexLayer = keyof typeof DEFAULT_Z_INDEX;
