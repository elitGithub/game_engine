// engine/tests/HeadlessPlatformAdapter.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { HeadlessPlatformAdapter } from '@engine/platform/HeadlessPlatformAdapter';
import type { HeadlessPlatformConfig } from '@engine/platform/HeadlessPlatformAdapter';

describe('HeadlessPlatformAdapter', () => {
    describe('Initialization', () => {
        it('should initialize with correct platform type', () => {
            const platform = new HeadlessPlatformAdapter();

            expect(platform.type).toBe('test');
            expect(platform.name).toBe('Headless Platform');
            expect(platform.version).toBe('1.0.0');
        });

        it('should use default configuration values', () => {
            const platform = new HeadlessPlatformAdapter();

            const container = platform.getRenderContainer();
            const dimensions = container.getDimensions();

            expect(dimensions.width).toBe(800);
            expect(dimensions.height).toBe(600);
        });

        it('should use custom configuration values', () => {
            const config: HeadlessPlatformConfig = {
                width: 1920,
                height: 1080,
                pixelRatio: 2.0,
                audio: true,
                input: true,
                storagePrefix: 'test_'
            };
            const platform = new HeadlessPlatformAdapter(config);

            const container = platform.getRenderContainer();
            const dimensions = container.getDimensions();

            expect(dimensions.width).toBe(1920);
            expect(dimensions.height).toBe(1080);
            expect(container.getPixelRatio?.()).toBe(2.0);
        });
    });

    describe('Render Container (Singleton)', () => {
        it('should create headless render container', () => {
            const platform = new HeadlessPlatformAdapter();

            const container = platform.getRenderContainer();
            expect(container).toBeDefined();
            expect(container.getType()).toBe('headless');
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const platform = new HeadlessPlatformAdapter();

            const container1 = platform.getRenderContainer();
            const container2 = platform.getRenderContainer();
            const container3 = platform.getRenderContainer();

            expect(container1).toBe(container2);
            expect(container2).toBe(container3);
        });

        it('should create container with custom dimensions', () => {
            const config: HeadlessPlatformConfig = {
                width: 1024,
                height: 768,
                pixelRatio: 1.5
            };
            const platform = new HeadlessPlatformAdapter(config);

            const container = platform.getRenderContainer();
            const dimensions = container.getDimensions();

            expect(dimensions.width).toBe(1024);
            expect(dimensions.height).toBe(768);
            expect(container.getPixelRatio?.()).toBe(1.5);
        });
    });

    describe('Audio Platform (Singleton)', () => {
        it('should return undefined when audio disabled (default)', () => {
            const platform = new HeadlessPlatformAdapter();

            const audio = platform.getAudioPlatform();
            expect(audio).toBeUndefined();
        });

        it('should create mock audio platform when enabled', () => {
            const config: HeadlessPlatformConfig = {
                audio: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            const audio = platform.getAudioPlatform();
            expect(audio).toBeDefined();
            expect(audio!.getType()).toBe('mock');
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: HeadlessPlatformConfig = {
                audio: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            const audio1 = platform.getAudioPlatform();
            const audio2 = platform.getAudioPlatform();
            const audio3 = platform.getAudioPlatform();

            expect(audio1).toBe(audio2);
            expect(audio2).toBe(audio3);
        });
    });

    describe('Storage Adapter (Singleton)', () => {
        it('should create in-memory storage adapter', () => {
            const platform = new HeadlessPlatformAdapter();

            const storage = platform.getStorageAdapter();
            expect(storage).toBeDefined();
        });

        it('should use custom storage prefix', () => {
            const config: HeadlessPlatformConfig = {
                storagePrefix: 'custom_'
            };
            const platform = new HeadlessPlatformAdapter(config);

            const storage = platform.getStorageAdapter();
            expect(storage).toBeDefined();
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const platform = new HeadlessPlatformAdapter();

            const storage1 = platform.getStorageAdapter();
            const storage2 = platform.getStorageAdapter();
            const storage3 = platform.getStorageAdapter();

            expect(storage1).toBe(storage2);
            expect(storage2).toBe(storage3);
        });

        it('should persist data in memory', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getStorageAdapter();

            await storage.save('test_key', 'test_value');
            const value = await storage.load('test_key');

            expect(value).toBe('test_value');
        });

        it('should handle prefixed keys correctly', async () => {
            const platform = new HeadlessPlatformAdapter({
                storagePrefix: 'game_'
            });
            const storage = platform.getStorageAdapter();

            await storage.save('save1', JSON.stringify({ timestamp: Date.now(), data: 'data1' }));
            await storage.save('save2', JSON.stringify({ timestamp: Date.now(), data: 'data2' }));

            const saves = await storage.list();
            expect(saves.map(s => s.slotId)).toContain('save1');
            expect(saves.map(s => s.slotId)).toContain('save2');
        });

        it('should support checking if save exists', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getStorageAdapter();

            const nonexistent = await storage.load('nonexistent');
            expect(nonexistent).toBeNull();

            await storage.save('existing', 'value');
            const existing = await storage.load('existing');
            expect(existing).toBe('value');
        });

        it('should support delete', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getStorageAdapter();

            await storage.save('temp', 'value');
            let value = await storage.load('temp');
            expect(value).toBe('value');

            await storage.delete('temp');
            value = await storage.load('temp');
            expect(value).toBeNull();
        });
    });

    describe('Input Adapter (Singleton)', () => {
        it('should return undefined when input disabled (default)', () => {
            const platform = new HeadlessPlatformAdapter();

            const input = platform.getInputAdapter();
            expect(input).toBeUndefined();
        });

        it('should create mock input adapter when enabled', () => {
            const config: HeadlessPlatformConfig = {
                input: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            const input = platform.getInputAdapter();
            expect(input).toBeDefined();
            expect(input!.getType()).toBe('mock');
        });

        it('should return same instance on multiple calls (singleton)', () => {
            const config: HeadlessPlatformConfig = {
                input: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            const input1 = platform.getInputAdapter();
            const input2 = platform.getInputAdapter();
            const input3 = platform.getInputAdapter();

            expect(input1).toBe(input2);
            expect(input2).toBe(input3);
        });
    });

    describe('Capabilities', () => {
        it('should report correct capabilities with defaults', () => {
            const platform = new HeadlessPlatformAdapter();

            const caps = platform.getCapabilities();
            expect(caps.rendering).toBe(true);
            expect(caps.audio).toBe(false); // Default audio: false
            expect(caps.input).toBe(false); // Default input: false
            expect(caps.storage).toBe(true);
            expect(caps.network).toBe(false);
            expect(caps.realtime).toBe(false);
        });

        it('should report correct capabilities with audio and input enabled', () => {
            const config: HeadlessPlatformConfig = {
                audio: true,
                input: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            const caps = platform.getCapabilities();
            expect(caps.rendering).toBe(true);
            expect(caps.audio).toBe(true);
            expect(caps.input).toBe(true);
            expect(caps.storage).toBe(true);
            expect(caps.network).toBe(false);
            expect(caps.realtime).toBe(false);
        });
    });

    describe('Lifecycle', () => {
        it('should initialize without error', async () => {
            const platform = new HeadlessPlatformAdapter();

            await expect(platform.initialize()).resolves.toBeUndefined();
        });

        it('should dispose all resources', () => {
            const config: HeadlessPlatformConfig = {
                audio: true,
                input: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            // Create all singletons
            platform.getRenderContainer();
            platform.getAudioPlatform();
            platform.getStorageAdapter();
            platform.getInputAdapter();

            // Dispose
            platform.dispose();

            // Verify singletons are cleared (new instances created)
            const newContainer = platform.getRenderContainer();
            expect(newContainer).toBeDefined();
        });

        it('should clear storage on dispose', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getStorageAdapter();

            await storage.save('test', 'value');
            const value = await storage.load('test');
            expect(value).toBe('value');

            platform.dispose();

            // After dispose, storage should be cleared
            const newStorage = platform.getStorageAdapter();
            const newValue = await newStorage.load('test');
            expect(newValue).toBeNull();
        });
    });

    describe('Testing Helpers', () => {
        it('should provide access to in-memory storage', () => {
            const platform = new HeadlessPlatformAdapter();

            const storage = platform.getInMemoryStorage();
            expect(storage).toBeDefined();
            expect(storage.size()).toBe(0);
        });

        it('should provide access to mock input adapter', () => {
            const config: HeadlessPlatformConfig = {
                input: true
            };
            const platform = new HeadlessPlatformAdapter(config);

            // Create the input adapter singleton first
            platform.getInputAdapter();

            const input = platform.getMockInputAdapter();
            expect(input).toBeDefined();
            expect(input!.getType()).toBe('mock');
        });

        it('should return null/undefined for mock input when disabled', () => {
            const platform = new HeadlessPlatformAdapter();

            const input = platform.getMockInputAdapter();
            expect(input).toBeFalsy(); // Can be null or undefined
        });

        it('should reset platform to initial state', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getStorageAdapter();

            // Add some data
            await storage.save('test', 'value');
            const value = await storage.load('test');
            expect(value).toBe('value');

            // Reset
            platform.reset();

            // Verify storage is cleared
            const newStorage = platform.getStorageAdapter();
            const newValue = await newStorage.load('test');
            expect(newValue).toBeNull();
        });

        it('should track storage size correctly', async () => {
            const platform = new HeadlessPlatformAdapter();
            const storage = platform.getInMemoryStorage();

            expect(storage.size()).toBe(0);

            await storage.save('key1', 'value1');
            expect(storage.size()).toBe(1);

            await storage.save('key2', 'value2');
            expect(storage.size()).toBe(2);

            storage.clear();
            expect(storage.size()).toBe(0);
        });
    });

    describe('InMemoryStorageAdapter', () => {
        let platform: HeadlessPlatformAdapter;

        beforeEach(() => {
            platform = new HeadlessPlatformAdapter({
                storagePrefix: 'test_'
            });
        });

        it('should save and load data', async () => {
            const storage = platform.getStorageAdapter();

            await storage.save('mykey', 'myvalue');
            const result = await storage.load('mykey');

            expect(result).toBe('myvalue');
        });

        it('should return null for non-existent key', async () => {
            const storage = platform.getStorageAdapter();

            const result = await storage.load('nonexistent');
            expect(result).toBeNull();
        });

        it('should list all saves', async () => {
            const storage = platform.getStorageAdapter();

            await storage.save('key1', JSON.stringify({ timestamp: Date.now(), data: 'val1' }));
            await storage.save('key2', JSON.stringify({ timestamp: Date.now(), data: 'val2' }));
            await storage.save('key3', JSON.stringify({ timestamp: Date.now(), data: 'val3' }));

            const saves = await storage.list();
            expect(saves).toHaveLength(3);
            expect(saves.map(s => s.slotId)).toContain('key1');
            expect(saves.map(s => s.slotId)).toContain('key2');
            expect(saves.map(s => s.slotId)).toContain('key3');
        });

        it('should only list saves with correct prefix', async () => {
            const storage = platform.getInMemoryStorage();

            // Manually add a key without the prefix
            await storage.save('prefixed', 'value1');
            (storage as any).storage.set('unprefixed', 'value2');

            const saves = await storage.list();
            expect(saves.map(s => s.slotId)).toContain('prefixed');
            expect(saves.map(s => s.slotId)).not.toContain('unprefixed');
        });

        it('should handle empty storage', async () => {
            const storage = platform.getStorageAdapter();

            const saves = await storage.list();
            expect(saves).toHaveLength(0);
        });

        it('should overwrite existing keys', async () => {
            const storage = platform.getStorageAdapter();

            await storage.save('key', 'value1');
            expect(await storage.load('key')).toBe('value1');

            await storage.save('key', 'value2');
            expect(await storage.load('key')).toBe('value2');
        });
    });
});
