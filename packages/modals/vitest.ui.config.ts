import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// UI component tests for React (jsdom + Testing Library) and Svelte (jsdom + svelte plugin).
// `resolve.conditions: ['browser']` is required so Svelte's package exports resolve to its
// client build under Vitest/Node — without it, `mount()` resolves to Svelte's server-only
// build and throws `lifecycle_function_unavailable` for every component test.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: true } })],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    include: ['test/ui/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/helpers/setup-ui.ts'],
  },
});
