// engine/systems/LocalizationManager.ts
import type { ISerializable } from '@engine/types';
import type {ILogger} from "@engine/interfaces";

/**
 * Represents the structure of localization data.
 * Keys map to either string values or nested LocalizationData objects.
 * This recursive structure allows for nested translation keys like:
 * { "ui": { "buttons": { "ok": "OK", "cancel": "Cancel" } } }
 */
interface LocalizationData {
    [key: string]: string | LocalizationData;
}

interface LocalizationSaveData {
    currentLanguage: string;
}

export class LocalizationManager implements ISerializable {
    private strings: Map<string, string> = new Map();

    constructor(private currentLanguage: string = 'en', private logger: ILogger) {
    }

    /**
     * Loads a language data object and flattens it into the string map.
     */
    public loadLanguage(lang: string, data: LocalizationData): void {
        this.currentLanguage = lang;
        this.strings.clear();
        this.flattenStrings(data);
        this.logger.log(`[LocalizationManager] Loaded ${this.strings.size} strings for ${lang}`);
    }

    /**
     * Sets the active language. Assumes this language has already been loaded.
     */
    public setLanguage(lang: string): void {
        this.currentLanguage = lang;
    }

    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Gets a translated string for a given key with indexed placeholder replacement.
     *
     * Uses indexed placeholders: {0}, {1}, {2}, etc., replaced by positional arguments.
     * This is the recommended method for simple parameter substitution.
     *
     * @param key - The localization key
     * @param args - Positional arguments to replace {0}, {1}, {2}, etc.
     * @returns The translated string with placeholders replaced
     *
     * @example
     * ```typescript
     * // Template: "Welcome, {0}! You have {1} new messages."
     * getString("welcome", "Alice", 5)
     * // Result: "Welcome, Alice! You have 5 new messages."
     * ```
     *
     * @example
     * ```typescript
     * // No placeholders
     * getString("ui.title")
     * // Result: "My Game"
     * ```
     */
    public getString(key: string, ...args: Array<string | number>): string {
        let str = this.strings.get(key);

        if (str === undefined) {
            this.logger.warn(`[LocalizationManager] Missing key: ${key}`);
            return key; // Fallback to the key itself
        }

        // Indexed parameter replacement: {0}, {1}, {2}
        if (args.length > 0) {
            str = str.replace(/{(\d+)}/g, (match, indexStr) => {
                const index = parseInt(indexStr, 10);
                return typeof args[index] !== 'undefined'
                    ? String(args[index])
                    : match;
            });
        }

        return str;
    }

    /**
     * Gets a translated string for a given key with named placeholder replacement.
     *
     * Uses named placeholders: {playerName}, {score}, etc., replaced by properties
     * from the params object. This is useful for complex translations with many
     * parameters or when parameter order may vary across languages.
     *
     * @param key - The localization key
     * @param params - Object with named parameters to replace in the template
     * @returns The translated string with placeholders replaced
     *
     * @example
     * ```typescript
     * // Template: "Player {playerName} scored {score} points in {time} seconds."
     * getStringNamed("game.score", {
     *   playerName: "Bob",
     *   score: 1500,
     *   time: 42
     * })
     * // Result: "Player Bob scored 1500 points in 42 seconds."
     * ```
     *
     * @example
     * ```typescript
     * // Handles missing parameters gracefully
     * getStringNamed("greeting", { name: "Alice" })
     * // Template with {name} and {title} will only replace {name}
     * ```
     */
    public getStringNamed(key: string, params: Record<string, string | number>): string {
        let str = this.strings.get(key);

        if (str === undefined) {
            this.logger.warn(`[LocalizationManager] Missing key: ${key}`);
            return key; // Fallback to the key itself
        }

        // Named parameter replacement: {playerName}, {score}
        str = str.replace(/{(\w+)}/g, (match, name) => {
            return typeof params[name] !== 'undefined'
                ? String(params[name])
                : match;
        });

        return str;
    }

    /**
     * Helper to flatten a nested JSON object into dot-notation keys.
     * e.g., { "ui": { "title": "Hello" } } => "ui.title": "Hello"
     */
    private flattenStrings(data: LocalizationData, prefix = ''): void {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = data[key];

                if (typeof value === 'string') {
                    this.strings.set(newKey, value);
                } else if (typeof value === 'object' && value !== null) {
                    // TypeScript knows value is LocalizationData here
                    this.flattenStrings(value, newKey);
                }
            }
        }
    }

    // --- ISerializable Implementation ---

    serialize(): LocalizationSaveData {
        return {
            currentLanguage: this.currentLanguage
            // We don't save the 'strings' map, as that is loaded from assets
        };
    }

    deserialize(data: LocalizationSaveData): void {
        this.currentLanguage = data.currentLanguage || 'en';
        this.strings.clear();
    }
}