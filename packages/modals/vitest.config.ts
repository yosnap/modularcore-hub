import { defineConfig } from 'vitest/config';

// Node-environment unit tests (core/, providers/). UI tests (jsdom + svelte) run
// separately via `test:ui` (vitest.ui.config.ts); smoke tests via `test:smoke`.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'test/ui/**', 'test/smoke/**'],
  },
});
