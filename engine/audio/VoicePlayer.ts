// engine/audio/VoicePlayer.ts
import type { EventBus } from '@engine/core/EventBus';
import type { AssetManager } from '@engine/systems/AssetManager';
import {ILogger} from "@engine/interfaces";
import { AudioUtils } from './AudioUtils';

/**
 * VoicePlayer - Handles simple, non-pooled playback for voice lines.
 */
export class VoicePlayer {
    private activeVoices: Set<AudioBufferSourceNode> = new Set();

    constructor(
        private audioContext: AudioContext,
        private assetManager: AssetManager,
        private eventBus: EventBus,
        private outputNode: GainNode,
        private logger: ILogger
    ) {}

    async playVoice(voiceId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(voiceId);
            if (!buffer) {
                throw new Error(`[VoicePlayer] Asset '${voiceId}' not found. Was it preloaded?`);
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = AudioUtils.toGain(volume);

            source.connect(gainNode);
            gainNode.connect(this.outputNode);

            source.onended = () => {
                this.activeVoices.delete(source);
                source.disconnect();
            };

            this.activeVoices.add(source);
            source.start(0);

            this.eventBus.emit('voice.started', { voiceId });
        } catch (error) {
            this.logger.error(`[VoicePlayer] Failed to play voice '${voiceId}':`, error);
        }
    }

    stopAll(): void {
        this.activeVoices.forEach(source => {
            source.onended = null;
            source.stop();
            source.disconnect();
        });
        this.activeVoices.clear();
    }

    dispose(): void {
        this.stopAll();
    }
}