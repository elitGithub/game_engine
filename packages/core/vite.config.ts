import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'),
            name: 'GameEngine',
            fileName: (format) => `game-engine.${format}.js`
        },
        outDir: '../../dist/packages/core',
        emptyOutDir: true
    },
    resolve: {
        alias: {
            '@game-engine/core': path.resolve(__dirname, './src')
        }
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.ts'],
        setupFiles: ['./src/tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: '../../coverage/packages/core',
            exclude: [
                'src/types/**'
            ]
        }
    }
});
