// engine/audio/VoicePlayer.ts
import type { EventBus } from '@engine/core/EventBus';
import type { AssetManager } from '@engine/systems/AssetManager';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import {ILogger} from "@engine/interfaces";
import { AudioUtils } from './AudioUtils';

/**
 * VoicePlayer - Handles simple, non-pooled playback for voice lines.
 */
export class VoicePlayer {
    private activeVoices: Set<IAudioSource> = new Set();

    constructor(
        private audioContext: IAudioContext,
        private assetManager: AssetManager,
        private eventBus: EventBus,
        private outputNode: IAudioGain,
        private logger: ILogger
    ) {}

    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<IAudioBuffer>(voiceId);
            if (!buffer) {
                throw new Error(`[VoicePlayer] Asset '${voiceId}' not found. Was it preloaded?`);
            }

            const source = this.audioContext.createSource(buffer);
            const gainNode = this.audioContext.createGain();
            gainNode.setValue(AudioUtils.toGain(volume));

            source.connect(gainNode);
            gainNode.connect(this.outputNode);

            // Note: Without onended callback support in IAudioSource interface,
            // we can't auto-remove from activeVoices. Sources will accumulate.
            // Consider implementing a cleanup mechanism or time-based removal.
            this.activeVoices.add(source);
            source.start(0);

            this.eventBus.emit('voice.started', { voiceId });
        } catch (error) {
            this.logger.error(`[VoicePlayer] Failed to play voice '${voiceId}':`, error);
        }
    }

    stopAll(): void {
        this.activeVoices.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
            source.disconnect();
        });
        this.activeVoices.clear();
    }

    dispose(): void {
        this.stopAll();
    }
}
