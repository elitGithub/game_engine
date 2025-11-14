/**
 * WebAudioDestination - Wraps native AudioDestinationNode
 */

import type { IAudioDestination } from '@engine/interfaces/IAudioPlatform';

export class WebAudioDestination implements IAudioDestination {
    constructor(private readonly native: AudioDestinationNode) {}

    get maxChannelCount(): number {
        return this.native.maxChannelCount;
    }

    getNative(): AudioDestinationNode {
        return this.native;
    }
}
