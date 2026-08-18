import { defineConfig } from 'vitest/config';

// Dedicated vitest config (instead of reusing vite.config.ts) so the workspace runner
// does not load the SvelteKit vite plugin, which needs a running dev/build context that
// vitest's own bundled Vite instance does not provide. No component tests yet in Phase 2.
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
