import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.ts: the build config carries React and Tailwind
 * plugins that the node-environment unit tests have no use for.
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
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
