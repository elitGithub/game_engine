import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  build: {
    outDir: '../../dist/apps/project-scribe-canvas',
    emptyOutDir: true
  }
});
