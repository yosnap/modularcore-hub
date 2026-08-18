import { defineConfig } from 'vitest/config';

// Smoke tests (real MinIO/Cloudinary) live under test/smoke and run only via `test:smoke`
// (vitest.smoke.config.ts) — excluded here so `pnpm test` never depends on real services.
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'test/smoke/**'],
  },
});
