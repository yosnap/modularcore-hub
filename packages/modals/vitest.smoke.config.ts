import { defineConfig } from 'vitest/config';

// Smoke tests exercise the reference in-memory provider end-to-end; excluded from `pnpm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/smoke/**/*.test.ts'],
  },
});
