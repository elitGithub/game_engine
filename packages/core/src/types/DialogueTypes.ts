// engine/types/DialogueTypes.ts

import type { TextStyleData } from './RenderingTypes';

/**
 * DialogueTypes - Types for dialogue and text rendering systems
 *
 * This file contains all types related to:
 * - Dialogue and narrative text display
 * - Speaker/character configuration
 * - Typewriter effect animation
 * - Text rendering options
 */

/**
 * TypewriterConfig - Configuration for typewriter text animation effect
 *
 * Controls the speed and behavior of character-by-character text reveal.
 * Used by TypewriterEffect to animate dialogue text.
 *
 * @example
 * ```typescript
 * const config: TypewriterConfig = {
 *   charsPerSecond: 30,        // 30 characters per second
 *   punctuationDelay: 200,     // 200ms pause after punctuation
 *   skipKey: 'Space',          // Press space to skip animation
 *   skipMultiplier: 5          // Skip shows text 5x faster
 * };
 * ```
 */
export interface TypewriterConfig {
    /**
     * Speed of text reveal in characters per second
     *
     * @default 20
     */
    charsPerSecond?: number;

    /**
     * Additional delay in milliseconds after punctuation marks
     *
     * Adds natural pauses after periods, commas, etc.
     * @default 0
     */
    punctuationDelay?: number;

    /**
     * Key code that triggers skip/fast-forward behavior
     *
     * @default undefined (no skip key)
     */
    skipKey?: string;

    /**
     * Speed multiplier when skip key is held
     *
     * @default 1 (instant reveal)
     */
    skipMultiplier?: number;
}

/**
 * SpeakerConfig - Configuration for a dialogue speaker/character
 *
 * Defines the visual and audio presentation of a character in dialogue.
 * Used by Speaker class to store character configuration and by
 * DialogueLayoutHelper for rendering.
 *
 * @example
 * ```typescript
 * const heroConfig: SpeakerConfig = {
 *   id: 'hero',
 *   name: 'Hero',
 *   displayName: 'The Hero',
 *   color: '#4a9eff',
 *   portrait: 'hero_neutral',
 *   portraitPosition: 'left',
 *   textStyle: {
 *     fontFamily: 'Georgia',
 *     fontSize: '18px',
 *     fontWeight: 'bold',
 *     color: '#ffffff'
 *   },
 *   voiceId: 'hero_voice',
 *   voicePitch: 1.0,
 *   voiceSpeed: 1.0
 * };
 * ```
 */
export interface SpeakerConfig {
    /**
     * Unique identifier for the speaker
     */
    id: string;

    /**
     * Internal name for the speaker
     */
    name: string;

    /**
     * Display name shown in dialogue UI
     *
     * @default Same as name
     */
    displayName?: string;

    /**
     * Color for speaker name text or UI elements
     *
     * @default undefined
     */
    color?: string;

    /**
     * Asset ID for character portrait image
     *
     * @default undefined (no portrait)
     */
    portrait?: string;

    /**
     * Position of portrait in dialogue UI
     *
     * @default 'left'
     */
    portraitPosition?: 'left' | 'right';

    /**
     * Text styling for speaker's dialogue
     *
     * @default undefined (uses default styling)
     */
    textStyle?: TextStyleData;

    /**
     * Voice asset ID for text-to-speech or voice clips
     *
     * @default undefined (no voice)
     */
    voiceId?: string;

    /**
     * Pitch adjustment for voice playback
     *
     * @default 1.0 (normal pitch)
     */
    voicePitch?: number;

    /**
     * Speed adjustment for voice playback
     *
     * @default 1.0 (normal speed)
     */
    voiceSpeed?: number;
}

/**
 * DialogueLineOptions - Per-line options for dialogue rendering
 *
 * Allows customization of dialogue presentation on a line-by-line basis.
 * Used when calling dialogue rendering functions to override speaker defaults.
 *
 * @example
 * ```typescript
 * const options: DialogueLineOptions = {
 *   showPortrait: false,  // Hide portrait for this line
 *   showName: true,       // Show speaker name
 *   style: {              // Custom styling for this line
 *     fontStyle: 'italic',
 *     color: '#cccccc'
 *   }
 * };
 * ```
 */
export interface DialogueLineOptions {
    /**
     * Whether to show the speaker's portrait
     *
     * @default true
     */
    showPortrait?: boolean;

    /**
     * Whether to show the speaker's name
     *
     * @default true
     */
    showName?: boolean;

    /**
     * Custom styling for this dialogue line
     *
     * Can be either:
     * - A string (preset style name)
     * - TextStyleData object for explicit styling
     *
     * @default undefined (uses speaker's default style)
     */
    style?: string | TextStyleData;
}

/**
 * RenderOptions - General text rendering options
 *
 * Generic rendering configuration used throughout the engine for
 * text display. More flexible than DialogueLineOptions and can be
 * used for any text rendering scenario.
 *
 * @example
 * ```typescript
 * const options: RenderOptions = {
 *   style: { fontSize: '24px', color: '#ff0000' },
 *   animate: true,
 *   speed: 30,
 *   speaker: 'narrator'
 * };
 * ```
 */
export interface RenderOptions {
    /**
     * Text styling configuration
     *
     * Can be either:
     * - A string (preset style name)
     * - TextStyleData object for explicit styling
     *
     * @default undefined (uses default styling)
     */
    style?: string | TextStyleData;

    /**
     * Whether to animate text reveal with typewriter effect
     *
     * @default false
     */
    animate?: boolean;

    /**
     * Animation speed in characters per second
     *
     * Only used if animate is true
     * @default 20
     */
    speed?: number;

    /**
     * Speaker ID for voice playback or style lookup
     *
     * @default undefined (no speaker)
     */
    speaker?: string;
}
