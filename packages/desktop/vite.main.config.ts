import path from 'node:path';

import { defineConfig } from 'vite';

// The main process runs the in-process Wavegrid brain (@wavegrid/server +
// @wavegrid/receiver). Those pull Node-only deps (ws, bonjour-service, fs) that
// must stay external — bundling them into the main chunk breaks their native /
// dynamic requires.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  build: {
    rollupOptions: {
      external: [
        '@wavegrid/server',
        '@wavegrid/receiver',
        '@wavegrid/settings',
        '@wavegrid/layout',
        '@wavegrid/discovery',
        'ws',
        'bonjour-service'
      ]
    }
  }
});
