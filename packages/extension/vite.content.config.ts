import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Content scripts declared to chrome.scripting run as classic scripts, so this
 * build emits a single self-contained IIFE. emptyOutDir is off because it runs
 * after the main build and shares its output directory.
 */
export default defineConfig({
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
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: 'src/content/index.ts',
      output: {
        format: 'iife',
        entryFileNames: 'content.js',
        inlineDynamicImports: true,
      },
    },
  },
});
