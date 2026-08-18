import { defineConfig } from 'vitest/config';

// Real-provider smoke (OpenRouter), run only via `pnpm test:smoke` / `turbo run test:smoke` —
// never part of the default `pnpm test` unit run.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/smoke/**/*.test.ts'],
  },
});
