import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `@tailwindcss/vite` is ESM-only; Vite bundles this config to CJS, so import it
// dynamically (same pattern as constructive-desktop).
export default defineConfig(async () => ({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  plugins: [react(), (await import('@tailwindcss/vite')).default()]
}));
