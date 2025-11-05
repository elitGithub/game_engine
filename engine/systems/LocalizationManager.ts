// engine/systems/LocalizationManager.ts
import type { ISerializable } from '@engine/types';

export class LocalizationManager implements ISerializable {
    private currentLanguage: string = 'en';
    private strings: Map<string, string> = new Map();

    constructor(initialLanguage: string = 'en') {
        this.currentLanguage = initialLanguage;
    }

    /**
     * Loads a language data object and flattens it into the string map.
     */
    public loadLanguage(lang: string, data: Record<string, any>): void {
        this.currentLanguage = lang;
        this.strings.clear();
        this.flattenStrings(data);
        console.log(`[LocalizationManager] Loaded ${this.strings.size} strings for ${lang}`);
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
     * Gets a translated string for a given key.
     * Supports simple placeholder replacement.
     */
    public getString(key: string, ...args: (string | number)[]): string {
        let str = this.strings.get(key);

        if (str === undefined) {
            console.warn(`[LocalizationManager] Missing key: ${key}`);
            return key; // Fallback to the key itself
        }

        // Handle placeholder replacement (e.g., "Welcome, {0}!")
        if (args.length > 0) {
            str = str.replace(/{(\d)}/g, (match, number) => {
                return typeof args[number] !== 'undefined'
                    ? String(args[number])
                    : match;
            });
        }
        return str;
    }

    /**
     * Helper to flatten a nested JSON object into dot-notation keys.
     * e.g., { "ui": { "title": "Hello" } } => "ui.title": "Hello"
     */
    private flattenStrings(data: Record<string, any>, prefix = ''): void {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = data[key];

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    this.flattenStrings(value, newKey);
                } else if (typeof value === 'string') {
                    this.strings.set(newKey, value);
                }
            }
        }
    }

    // --- ISerializable Implementation ---

    serialize(): any {
        return {
            currentLanguage: this.currentLanguage
            // We don't save the 'strings' map, as that is loaded from assets
        };
    }

    deserialize(data: any): void {
        this.currentLanguage = data.currentLanguage || 'en';
        // Note: After loading, the game must manually reload the
        // string data for the 'currentLanguage' from the AssetManager.
    }
}