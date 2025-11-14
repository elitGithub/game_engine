// engine/audio/VoicePlayer.ts
import type { EventBus } from '@engine/core/EventBus';
import type { AssetManager } from '@engine/systems/AssetManager';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import type {ILogger} from "@engine/interfaces";
import { AudioUtils } from '@engine/audio/AudioUtils';

/**
 * VoicePlayer - Handles simple, non-pooled playback for voice lines.
 */
export class VoicePlayer {
    private readonly activeVoices: Set<{ source: IAudioSource; gain: IAudioGain }> = new Set();

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

            const voiceEntry = { source, gain: gainNode };
            this.activeVoices.add(voiceEntry);

            // Auto-remove from activeVoices when playback completes naturally
            source.onEnded(() => {
                this.activeVoices.delete(voiceEntry);
                source.disconnect();
                gainNode.disconnect();
                this.eventBus.emit('voice.ended', { voiceId });
            });

            source.start(0);

            this.eventBus.emit('voice.started', { voiceId });
        } catch (error) {
            this.logger.error(`[VoicePlayer] Failed to play voice '${voiceId}':`, error);
        }
    }

    stopAll(): void {
        this.activeVoices.forEach(({ source, gain }) => {
            source.stop();
            source.disconnect();
            gain.disconnect();
        });
        this.activeVoices.clear();
    }

    /**
     * Get count of currently active voices.
     *
     * Intended for testing and debugging memory leaks.
     * Production code should not rely on this method.
     *
     * @internal
     * @returns Number of voices currently playing
     */
    getActiveVoiceCount(): number {
        return this.activeVoices.size;
    }

    dispose(): void {
        this.stopAll();
    }
}
