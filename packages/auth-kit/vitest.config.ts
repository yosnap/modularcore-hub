import { defineConfig } from 'vitest/config';

// Node-environment unit tests (core/, integrations/). UI/DOM tests (jsdom, per-framework
// component rendering) run separately via `test:ui` (vitest.ui.config.ts) — same split as
// packages/modals.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'test/ui/**'],
  },
});
