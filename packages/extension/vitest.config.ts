import { defineConfig } from 'vitest/config';

/**
 * Separate from vite.config.ts: the build config carries React and Tailwind
 * plugins that the node-environment unit tests have no use for.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
