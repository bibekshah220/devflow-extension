import { defineConfig } from 'vite';

/**
 * Content scripts declared to chrome.scripting run as classic scripts, so this
 * build emits a single self-contained IIFE. emptyOutDir is off because it runs
 * after the main build and shares its output directory.
 */
export default defineConfig({
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
