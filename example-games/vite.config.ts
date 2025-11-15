import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.', // Serve from game/ directory
    resolve: {
        alias: {
            '@engine': path.resolve(__dirname, '../engine')
        }
    },
    server: {
        port: 3000
    }
});