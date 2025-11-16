/**
 * Audio Platform Implementations
 *
 * Concrete implementations of IAudioPlatform interface.
 * Separated from interface definitions to maintain clean architectural boundaries.
 */

export { WebAudioPlatform } from '@game-engine/core/platform/webaudio/WebAudioPlatform';
export { MockAudioPlatform } from '@game-engine/core/platform/mock/MockAudioPlatform';
