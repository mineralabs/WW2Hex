import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Scenario data lives in /scenarios at the repository root.
    fs: { allow: [repoRoot] },
  },
  build: {
    outDir: 'dist',
    // PixiJS is large; one chunk is fine for a locally served prototype.
    chunkSizeWarningLimit: 2000,
  },
});
