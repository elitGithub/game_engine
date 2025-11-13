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
     * Gets a translated string for a given key.
     * Supports simple placeholder replacement.
     */
    public getString(key: string, ...args: (string | number)[]): string {
        let str = this.strings.get(key);

        if (str === undefined) {
            this.logger.warn(`[LocalizationManager] Missing key: ${key}`);
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