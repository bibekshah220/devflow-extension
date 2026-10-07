import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Builds the extension pages and the service worker. The content script is a
 * separate build (vite.content.config.ts) because MV3 injects it as a classic
 * script, which rules out the ES module output this config produces.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Resolve the workspace package to its source. Consuming its build output would
  // make this build depend on another package having been built first, which breaks
  // any CI that builds this workspace alone.
  resolve: {
    alias: {
      '@devflow/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        sidepanel: 'sidepanel.html',
        'service-worker': 'src/background/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
