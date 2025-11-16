// engine/types/ItemTypes.ts

/**
 * ItemTypes - Optional game-specific types
 *
 * This file contains optional types that games may use but are not
 * required by the engine. These are provided as helpful starting points
 * for common game development patterns.
 *
 * Games are free to:
 * - Use these types as-is
 * - Extend these types with additional properties
 * - Completely ignore these types and define their own
 */

/**
 * BaseItem - Optional base interface for inventory items
 *
 * This is a suggested starting point for item definitions in inventory
 * systems. The engine does not use or require this interface; it's purely
 * a convenience for game developers.
 *
 * Games can extend this interface with game-specific properties like:
 * - type (weapon, consumable, quest item)
 * - value (gold cost)
 * - weight
 * - durability
 * - effects
 *
 * @example
 * ```typescript
 * interface Weapon extends BaseItem {
 *   type: 'weapon';
 *   damage: number;
 *   attackSpeed: number;
 * }
 *
 * interface Consumable extends BaseItem {
 *   type: 'consumable';
 *   effect: (player: Player) => void;
 *   stackable: true; // Can stack multiple
 * }
 * ```
 *
 * @example
 * ```typescript
 * const healthPotion: BaseItem = {
 *   id: 'potion_health_small',
 *   name: 'Small Health Potion',
 *   description: 'Restores 50 HP',
 *   stackable: true
 * };
 * ```
 */
export interface BaseItem {
    /**
     * Unique identifier for the item
     */
    id: string;

    /**
     * Display name of the item
     */
    name: string;

    /**
     * Optional description text
     */
    description?: string;

    /**
     * Whether multiple instances can stack in a single inventory slot
     *
     * @default false
     */
    stackable?: boolean;
}
