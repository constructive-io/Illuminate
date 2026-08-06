import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `@tailwindcss/vite` is ESM-only; Vite bundles this config to CJS, so import it
// dynamically (same pattern as constructive-desktop).
export default defineConfig(async () => ({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
    // Forge's plugin-vite defaults to preserveSymlinks: true, which breaks
    // transitive-dep resolution under pnpm's symlinked node_modules.
    preserveSymlinks: false
  },
  plugins: [react(), (await import('@tailwindcss/vite')).default()]
}));
