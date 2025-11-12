// engine/audio/SfxPool.ts
import type { AssetManager } from '@engine/systems/AssetManager';

interface SFXPoolItem {
    buffer: AudioBuffer;
    available: AudioBufferSourceNode[];
    maxSize: number;
}

/**
 * SfxPool - Handles playback and pooling of short sound effects.
 */
export class SfxPool {
    private pools: Map<string, SFXPoolItem> = new Map();
    private activeSources: Set<AudioBufferSourceNode> = new Set();

    constructor(
        private audioContext: AudioContext,
        private assetManager: AssetManager,
        private outputNode: GainNode,
        private defaultMaxSize: number
    ) {}

    async play(soundId: string, volume: number = 1.0): Promise<void> {
        try {
            const buffer = this.assetManager.get<AudioBuffer>(soundId);
            if (!buffer) {
                throw new Error(`[SfxPool] Asset '${soundId}' not found. Was it preloaded?`);
            }

            let source = this.getFromPool(soundId, buffer);

            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = Math.max(0, Math.min(1, volume));

            source.connect(gainNode);
            gainNode.connect(this.outputNode);

            source.onended = () => {
                this.activeSources.delete(source);
                this.returnToPool(soundId, source);
            };

            this.activeSources.add(source);
            source.start(0);

        } catch (error) {
            console.error(`[SfxPool] Failed to play sound '${soundId}':`, error);
        }
    }

    private getFromPool(soundId: string, buffer: AudioBuffer): AudioBufferSourceNode {
        let pool = this.pools.get(soundId);
        if (!pool) {
            pool = {
                buffer: buffer,
                available: [],
               maxSize: this.defaultMaxSize
            };
            this.pools.set(soundId, pool);
        }

        if (pool.available.length > 0) {
            return pool.available.pop()!;
        }

        // Create a new one if pool is empty
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    private returnToPool(soundId: string, source: AudioBufferSourceNode): void {
        const pool = this.pools.get(soundId);

        // Disconnect to prevent memory leaks
        source.disconnect();
        source.onended = null;

        if (pool && pool.available.length < pool.maxSize) {
            pool.available.push(source);
        }
        // If pool is full, the source node is just left for garbage collection.
    }

    stopAll(): void {
        this.activeSources.forEach(source => {
            source.onended = null; // Prevent returnToPool
            source.stop();
            source.disconnect();
        });
        this.activeSources.clear();

        // Clear all available sources from pools
        this.pools.forEach(pool => {
            pool.available = [];
        });
    }

    dispose(): void {
        this.stopAll();
        this.pools.clear();
    }
}