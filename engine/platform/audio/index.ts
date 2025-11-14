/**
 * Audio Platform Implementations
 *
 * Concrete implementations of IAudioPlatform interface.
 * Separated from interface definitions to maintain clean architectural boundaries.
 */

export { WebAudioPlatform } from '@engine/platform/webaudio/WebAudioPlatform';
export { MockAudioPlatform } from '@engine/platform/mock/MockAudioPlatform';
