// engine/audio/SfxPool.ts
import type { AssetManager } from '@engine/systems/AssetManager';
import type { IAudioContext, IAudioBuffer, IAudioSource, IAudioGain } from '@engine/interfaces/IAudioPlatform';
import type {ILogger} from "@engine/interfaces";
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
    private globalActiveChains: Map<AudioChain, string> = new Map(); // Track all active chains globally

    constructor(
        private audioContext: IAudioContext,
        private assetManager: AssetManager,
        private outputNode: IAudioGain,
        private defaultMaxSize: number,
        private maxSources: number,
        private logger: ILogger
    ) {}

    async play(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<IAudioBuffer>(soundId);
            if (!buffer) {
                throw new Error(`[SfxPool] Asset '${soundId}' not found. Was it preloaded?`);
            }

            // Check if we've hit the hardware limit (maxSources)
            // If so, implement voice stealing - stop the oldest playing sound
            if (this.globalActiveChains.size >= this.maxSources) {
                this.stealOldestVoice();
            }

            const chain = this.getChainFromPool(soundId, buffer);

            // Apply volume using exponential gain conversion
            chain.gain.setValue(AudioUtils.toGain(volume));

            // Track and play
            const pool = this.ensurePool(soundId, buffer);
            pool.active.add(chain);
            this.globalActiveChains.set(chain, soundId);

            // Return chain to pool when playback completes naturally
            chain.source.onEnded(() => {
                pool.active.delete(chain);
                this.globalActiveChains.delete(chain);

                // Only pool if under max size
                if (pool.available.length < pool.maxSize) {
                    pool.available.push(chain);
                } else {
                    // Over capacity - disconnect and discard
                    chain.gain.disconnect();
                }
            });

            chain.source.start(0);

        } catch (error) {
            this.logger.error(`[SfxPool] Failed to play sound '${soundId}':`, error);
        }
    }

    /**
     * Voice stealing - stop the oldest playing sound to free up a hardware voice.
     * Maps preserve insertion order, so the first entry is the oldest.
     */
    private stealOldestVoice(): void {
        // Get the first (oldest) active chain
        const firstEntry = this.globalActiveChains.entries().next();
        if (firstEntry.done) {
            return; // No active chains to steal
        }

        const [oldestChain, soundId] = firstEntry.value;

        // Stop the chain
        try {
            oldestChain.source.stop();
        } catch (e) {
            // Ignore errors if already stopped
        }

        // Clean up tracking
        this.globalActiveChains.delete(oldestChain);

        // Remove from pool's active set
        const pool = this.pools.get(soundId);
        if (pool) {
            pool.active.delete(oldestChain);
        }

        // Return to pool if under capacity
        if (pool && pool.available.length < pool.maxSize) {
            pool.available.push(oldestChain);
        } else {
            // Over capacity - disconnect and discard
            oldestChain.gain.disconnect();
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

        // Clear global tracking
        this.globalActiveChains.clear();
    }

    dispose(): void {
        this.stopAll();
        this.pools.clear();
    }
}
