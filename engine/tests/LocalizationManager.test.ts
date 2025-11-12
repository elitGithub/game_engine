// engine/tests/LocalizationManager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalizationManager } from '@engine/systems/LocalizationManager';
import {ILogger} from "@engine/interfaces";
const mockLogger: ILogger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
const en = {
    ui: {
        title: 'Hello',
        welcome: 'Welcome, {0}!'
    },
    items: {
        potion: 'Potion'
    }
};

const es = {
    ui: {
        title: 'Hola',
        welcome: '¡Bienvenido, {0}!'
    },
    items: {
        potion: 'Poción'
    }
};

describe('LocalizationManager', () => {
    let loc: LocalizationManager;

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        loc = new LocalizationManager('en', mockLogger);
        loc.loadLanguage('en', en);
    });

    it('should initialize with a language', () => {
        expect(loc.getCurrentLanguage()).toBe('en');
    });

    it('should flatten and retrieve a simple string', () => {
        expect(loc.getString('ui.title')).toBe('Hello');
    });

    it('should retrieve a string with placeholders', () => {
        expect(loc.getString('ui.welcome', 'Player')).toBe('Welcome, Player!');
    });

    it('should return the key and warn for a missing string', () => {
        expect(loc.getString('ui.missing')).toBe('ui.missing');
        expect(console.warn).toHaveBeenCalledWith('[LocalizationManager] Missing key: ui.missing');
    });

    it('should load a new language and switch', () => {
        loc.loadLanguage('es', es);

        expect(loc.getCurrentLanguage()).toBe('es');
        expect(loc.getString('ui.title')).toBe('Hola');
        expect(loc.getString('items.potion')).toBe('Poción');
    });

    it('should serialize its state', () => {
        loc.loadLanguage('es', es);
        const serialized = loc.serialize();
        expect(serialized).toEqual({ currentLanguage: 'es' });
    });

    it('should deserialize its state', () => {
        const serialized = { currentLanguage: 'es' };
        loc.deserialize(serialized);

        expect(loc.getCurrentLanguage()).toBe('es');

        // Note: Deserialization ONLY sets the language key.
        // The string data is missing, as it's expected to be re-loaded
        expect(loc.getString('ui.title')).toBe('ui.title');
    });
});