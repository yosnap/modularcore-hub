import { defineConfig } from 'vitest/config';

// Real-provider smokes (OpenRouter) live under test/smoke and run only via `test:smoke`
// (vitest.smoke.config.ts) — excluded here so `pnpm test` never depends on a real API key.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'test/smoke/**'],
  },
});
