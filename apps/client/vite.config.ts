import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { guidePages } from './guide-pages.ts';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  // guidePages serves docs/players-guide.md and docs/combat-rules.md as searchable pages next to the game.
  plugins: [react(), guidePages()],
  server: {
    port: 5173,
    fs: { allow: [repoRoot] },
    // The game host must be running too (npm run host:dev); pages talk to it through here.
    proxy: {
      '/ws': { target: 'ws://localhost:8790', ws: true },
      '/api': { target: 'http://localhost:8790' },
    },
  },
  build: {
    outDir: 'dist',
    // PixiJS is large; one chunk is fine for a locally served prototype.
    chunkSizeWarningLimit: 2000,
  },
});
