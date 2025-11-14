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
        welcome: 'Welcome, {0}!',
        multiParam: 'Welcome, {0}! You have {1} new messages.',
        namedGreeting: 'Hello, {name}!',
        namedScore: 'Player {playerName} scored {score} points in {time} seconds.'
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
        expect(mockLogger.warn).toHaveBeenCalledWith('[LocalizationManager] Missing key: ui.missing');
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

        // Note: Deserialization preserves loaded strings in memory.
        // In a real scenario, strings are loaded during initialization,
        // then deserialize() is called to restore the language setting.
        // The 'en' strings from beforeEach remain accessible.
        expect(loc.getString('ui.title')).toBe('Hello');
    });

    // New getStringNamed() tests
    it('should retrieve a string with named placeholders using getStringNamed', () => {
        expect(loc.getStringNamed('ui.namedGreeting', { name: 'Alice' }))
            .toBe('Hello, Alice!');
    });

    it('should handle multiple named placeholders using getStringNamed', () => {
        expect(loc.getStringNamed('ui.namedScore', {
            playerName: 'Bob',
            score: 1500,
            time: 42
        })).toBe('Player Bob scored 1500 points in 42 seconds.');
    });

    it('should handle missing named parameters gracefully', () => {
        // Only provides 'name', but template has both {name} and potentially other placeholders
        expect(loc.getStringNamed('ui.namedGreeting', { name: 'Charlie' }))
            .toBe('Hello, Charlie!');
    });

    it('should leave unmatched named placeholders intact', () => {
        // Provides 'playerName' but not 'score' or 'time'
        expect(loc.getStringNamed('ui.namedScore', { playerName: 'Dave' }))
            .toBe('Player Dave scored {score} points in {time} seconds.');
    });

    it('should handle multiple indexed placeholders with getString', () => {
        expect(loc.getString('ui.multiParam', 'Alice', 5))
            .toBe('Welcome, Alice! You have 5 new messages.');
    });

    it('should return key for missing string with getStringNamed', () => {
        vi.clearAllMocks();
        expect(loc.getStringNamed('ui.missing', { name: 'Test' }))
            .toBe('ui.missing');
        expect(mockLogger.warn).toHaveBeenCalledWith('[LocalizationManager] Missing key: ui.missing');
    });
});