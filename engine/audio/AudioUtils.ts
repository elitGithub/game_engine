// engine/audio/AudioUtils.ts

/**
 * Audio utilities for natural volume perception
 *
 * Human hearing is logarithmic - we perceive equal ratios of intensity as equal steps.
 * To compensate, we apply an EXPONENTIAL curve to linear input values.
 * This makes linear volume sliders feel natural to users.
 */
export class AudioUtils {
    /**
     * Convert linear volume (0-1) to exponential gain for natural perception
     *
     * Uses exponential curve (volume²) to compensate for logarithmic hearing.
     * This makes linear sliders feel natural to users.
     *
     * @param volume - Linear volume value (0-1)
     * @returns Exponential gain value (0-1)
     *
     * @example
     * AudioUtils.toGain(0.5) // Returns 0.25
     * AudioUtils.toGain(1.0) // Returns 1.0
     * AudioUtils.toGain(NaN) // Returns 0 (safety)
     */
    static toGain(volume: number): number {
        // Safety: WebAudio throws on NaN/Infinity gain values in some browsers
        if (!Number.isFinite(volume)) {
            return 0;
        }

        const clamped = Math.max(0, Math.min(1, volume));
        return clamped * clamped; // Exponential curve
    }

    /**
     * Convert exponential gain back to linear volume
     *
     * Inverse operation of toGain(). Use this when reading gain values
     * that need to be displayed on linear UI controls.
     *
     * @param gain - Exponential gain value (0-1)
     * @returns Linear volume value (0-1)
     *
     * @example
     * AudioUtils.toVolume(0.25) // Returns 0.5
     * AudioUtils.toVolume(1.0) // Returns 1.0
     * AudioUtils.toVolume(NaN) // Returns 0 (safety)
     */
    static toVolume(gain: number): number {
        // Safety: Prevent NaN from sqrt of negative or NaN input
        if (!Number.isFinite(gain)) {
            return 0;
        }

        const clamped = Math.max(0, Math.min(1, gain));
        return Math.sqrt(clamped); // Inverse of exponential
    }
}
