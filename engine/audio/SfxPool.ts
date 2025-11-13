// engine/audio/SfxPool.ts
import type { AssetManager } from '@engine/systems/AssetManager';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import {ILogger} from "@engine/interfaces";
import { AudioUtils } from './AudioUtils';

/**
 * Complete audio chain for pooling (both source and gain nodes)
 */
interface AudioChain {
    source: IAudioSource;
    gain: IAudioGain;
}

interface SFXPoolItem {
    buffer: IAudioBuffer;
    available: AudioChain[];
    active: Set<AudioChain>;
    maxSize: number;
}

/**
 * SfxPool - Handles playback and pooling of short sound effects.
 */
export class SfxPool {
    private pools: Map<string, SFXPoolItem> = new Map();

    constructor(
        private audioContext: IAudioContext,
        private assetManager: AssetManager,
        private outputNode: IAudioGain,
        private defaultMaxSize: number,
        private logger: ILogger
    ) {}

    async play(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<IAudioBuffer>(soundId);
            if (!buffer) {
                throw new Error(`[SfxPool] Asset '${soundId}' not found. Was it preloaded?`);
            }

            const chain = this.getChainFromPool(soundId, buffer);

            // Apply volume using exponential gain conversion
            chain.gain.setValue(AudioUtils.toGain(volume));

            // Track and play
            const pool = this.ensurePool(soundId, buffer);
            pool.active.add(chain);

            // Note: We can't set onended callback with IAudioSource interface
            // We'll need to clean up chains periodically or accept they stay in active set
            chain.source.start(0);

        } catch (error) {
            this.logger.error(`[SfxPool] Failed to play sound '${soundId}':`, error);
        }
    }

    /**
     * Ensure a pool exists for the given sound
     */
    private ensurePool(soundId: string, buffer: IAudioBuffer): SFXPoolItem {
        let pool = this.pools.get(soundId);
        if (!pool) {
            pool = {
                buffer: buffer,
                available: [],
                active: new Set(),
                maxSize: this.defaultMaxSize
            };
            this.pools.set(soundId, pool);
        }
        return pool;
    }

    /**
     * Create a new audio chain (source + gain)
     */
    private createChain(buffer: IAudioBuffer): AudioChain {
        const source = this.audioContext.createSource(buffer);
        const gain = this.audioContext.createGain();

        source.connect(gain);
        gain.connect(this.outputNode);

        return { source, gain };
    }

    /**
     * Get an audio chain from the pool, or create a new one
     */
    private getChainFromPool(soundId: string, buffer: IAudioBuffer): AudioChain {
        const pool = this.ensurePool(soundId, buffer);

        if (pool.available.length > 0) {
            const chain = pool.available.pop()!;

            // Reset gain to full volume
            chain.gain.setValue(1.0);

            // Recreate source (IAudioSource is single-use)
            chain.source = this.audioContext.createSource(buffer);
            chain.source.connect(chain.gain);

            return chain;
        }

        // No available chains - create new
        return this.createChain(buffer);
    }

    /**
     * Return an audio chain to the pool for reuse
     * Note: Without onended callback support in IAudioSource, this method
     * won't be called automatically. Consider implementing a cleanup mechanism.
     */
    private returnChainToPool(soundId: string, chain: AudioChain): void {
        const pool = this.pools.get(soundId);
        if (!pool) return;

        // Remove from active tracking
        pool.active.delete(chain);

        // Disconnect old source (it's dead after playing)
        chain.source.disconnect();

        // Return to pool if under limit
        if (pool.available.length < pool.maxSize) {
            pool.available.push(chain);
        } else {
            // Exceeded limit - cleanup entire chain
            chain.gain.disconnect();
        }
    }

    stopAll(): void {
        // Stop all active chains
        this.pools.forEach(pool => {
            pool.active.forEach(chain => {
                try {
                    chain.source.stop();
                } catch (e) {
                    // Ignore errors if already stopped
                }
                chain.source.disconnect();
            });
            pool.active.clear();

            // Clear available chains
            pool.available.forEach(chain => {
                chain.gain.disconnect();
            });
            pool.available = [];
        });
    }

    dispose(): void {
        this.stopAll();
        this.pools.clear();
    }
}
