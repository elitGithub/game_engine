// engine/audio/SfxPool.ts
import type { AssetManager } from '@engine/systems/AssetManager';
import {ILogger} from "@engine/interfaces";
import { AudioUtils } from './AudioUtils';

/**
 * Complete audio chain for pooling (both source and gain nodes)
 */
interface AudioChain {
    source: AudioBufferSourceNode;
    gain: GainNode;
}

interface SFXPoolItem {
    buffer: AudioBuffer;
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
        private audioContext: AudioContext,
        private assetManager: AssetManager,
        private outputNode: GainNode,
        private defaultMaxSize: number,
        private logger: ILogger
    ) {}

    async play(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(soundId);
            if (!buffer) {
                throw new Error(`[SfxPool] Asset '${soundId}' not found. Was it preloaded?`);
            }

            const chain = this.getChainFromPool(soundId, buffer);

            // Apply volume using exponential gain conversion
            chain.gain.gain.setValueAtTime(
                AudioUtils.toGain(volume),
                this.audioContext.currentTime
            );

            // Setup pooling on completion
            chain.source.onended = () => {
                this.returnChainToPool(soundId, chain);
            };

            // Track and play
            const pool = this.ensurePool(soundId, buffer);
            pool.active.add(chain);
            chain.source.start(0);

        } catch (error) {
            this.logger.error(`[SfxPool] Failed to play sound '${soundId}':`, error);
        }
    }

    /**
     * Ensure a pool exists for the given sound
     */
    private ensurePool(soundId: string, buffer: AudioBuffer): SFXPoolItem {
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
    private createChain(buffer: AudioBuffer): AudioChain {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gain = this.audioContext.createGain();

        source.connect(gain);
        gain.connect(this.outputNode);

        return { source, gain };
    }

    /**
     * Get an audio chain from the pool, or create a new one
     * CRITICAL: Clears automation timeline to prevent "ghost automation" bug
     */
    private getChainFromPool(soundId: string, buffer: AudioBuffer): AudioChain {
        const pool = this.ensurePool(soundId, buffer);

        if (pool.available.length > 0) {
            const chain = pool.available.pop()!;

            // CRITICAL FIX: Clear automation timeline to prevent ghost automation
            // If previous sound used fade-out, the gain timeline persists and next sound plays silently
            const now = this.audioContext.currentTime;
            chain.gain.gain.cancelScheduledValues(now);
            chain.gain.gain.setValueAtTime(1.0, now); // Reset to full volume

            // Recreate source (AudioBufferSourceNode is single-use)
            chain.source = this.audioContext.createBufferSource();
            chain.source.buffer = buffer;
            chain.source.connect(chain.gain);

            return chain;
        }

        // No available chains - create new
        return this.createChain(buffer);
    }

    /**
     * Return an audio chain to the pool for reuse
     */
    private returnChainToPool(soundId: string, chain: AudioChain): void {
        const pool = this.pools.get(soundId);
        if (!pool) return;

        // Remove from active tracking
        pool.active.delete(chain);

        // Disconnect old source (it's dead after playing)
        chain.source.disconnect();
        chain.source.onended = null;

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
                chain.source.onended = null; // Prevent returnToPool
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