import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        // --- THIS IS THE FIX ---
        // Configure Vite to build a library, not an application
        lib: {
            // The entry file we just created
            entry: path.resolve(__dirname, 'engine/index.ts'),
            // The name for the UMD global variable
            name: 'GameEngine',
            // The output filenames for different formats
            fileName: (format) => `game-engine.${format}.js`
        },
        // --- END FIX ---
    },
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
        setupFiles: ['./engine/tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: [
                'engine/types/**'
            ]
        }
    }
});