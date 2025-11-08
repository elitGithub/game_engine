// engine/tests/SpeakerRegistry.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { SpeakerRegistry } from '@engine/rendering/SpeakerRegistry';
import { Speaker } from '@engine/rendering/Speaker';
import type { SpeakerConfig } from '@engine/types';

describe('SpeakerRegistry', () => {
    let registry: SpeakerRegistry;

    beforeEach(() => {
        registry = new SpeakerRegistry();
    });

    it('should have a "narrator" speaker by default', () => {
        const narrator = registry.get('narrator');
        expect(narrator).toBeDefined();
        expect(narrator.id).toBe('narrator');
        expect(narrator.name).toBe('Narrator');
    });

    it('should return the "narrator" as a fallback for unknown IDs', () => {
        const unknown = registry.get('unknown_speaker_id');
        expect(unknown).toBeDefined();
        expect(unknown.id).toBe('narrator');
    });

    it('should register a new speaker', () => {
        const playerConfig: SpeakerConfig = {
            id: 'player',
            name: 'Hero',
            color: 'blue'
        };
        const player = new Speaker(playerConfig);

        registry.register(player);

        expect(registry.has('player')).toBe(true);
        const retrieved = registry.get('player');
        expect(retrieved).toBe(player);
        expect(retrieved.name).toBe('Hero');
    });

    it('should overwrite an existing speaker', () => {
        const newNarrator = new Speaker({ id: 'narrator', name: 'Storyteller' });
        registry.register(newNarrator);

        const retrieved = registry.get('narrator');
        expect(retrieved.name).toBe('Storyteller');
    });

    it('should register multiple speakers from config', () => {
        const configs: SpeakerConfig[] = [
            { id: 'player', name: 'Hero' },
            { id: 'npc1', name: 'Villager' }
        ];

        registry.registerMultiple(configs);

        expect(registry.has('player')).toBe(true);
        expect(registry.has('npc1')).toBe(true);
        expect(registry.get('npc1').name).toBe('Villager');
    });

    it('should get all registered speakers', () => {
        registry.register(new Speaker({ id: 'player', name: 'Hero' }));

        const all = registry.getAll();

        // Includes default narrator + new player
        expect(all).toHaveLength(2);
        expect(all.map(s => s.id)).toContain('narrator');
        expect(all.map(s => s.id)).toContain('player');
    });
});