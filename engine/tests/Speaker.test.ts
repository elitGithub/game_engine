// engine/tests/Speaker.test.ts

import { describe, it, expect } from 'vitest';
import { Speaker } from '@engine/rendering/Speaker';
import type { SpeakerConfig } from '@engine/types';

describe('Speaker', () => {
    it('should use default values', () => {
        const config: SpeakerConfig = { id: 'test', name: 'Test' };
        const speaker = new Speaker(config);

        expect(speaker.id).toBe('test');
        expect(speaker.name).toBe('Test');
        expect(speaker.displayName).toBe('Test'); // Defaults to name
        expect(speaker.color).toBe('#ffffff');
        expect(speaker.portrait).toBe(null);
        expect(speaker.portraitPosition).toBe('left');
        expect(speaker.textStyle).toBe(null);
    });

    it('should use provided values', () => {
        const style = { color: 'blue' };
        const config: SpeakerConfig = {
            id: 'player',
            name: 'Hero',
            displayName: 'The Hero',
            color: 'red',
            portrait: 'hero_img',
            portraitPosition: 'right',
            textStyle: style
        };
        const speaker = new Speaker(config);

        expect(speaker.displayName).toBe('The Hero');
        expect(speaker.color).toBe('red');
        expect(speaker.portrait).toBe('hero_img');
        expect(speaker.portraitPosition).toBe('right');
        expect(speaker.textStyle).toBe(style);
    });
});