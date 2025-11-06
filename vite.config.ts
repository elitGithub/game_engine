import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@engine': path.resolve(__dirname, './engine')
        }
    },
    test: {
        // Enable globals (describe, it, expect, etc.)
        globals: true,
        // Use 'jsdom' to simulate a browser environment
        environment: 'jsdom',
        // Look for test files in the entire 'engine' directory
        include: ['engine/**/*.{test,spec}.ts'],
        // Point to your tsconfig for path resolution
        setupFiles: [],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: [
                'engine/types/**'
            ]
        }
    }
});