import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import vue from '@vitejs/plugin-vue';

// UI component tests for React, Svelte and Vue (jsdom + Testing Library). Angular component
// tests follow media-picker's approach (adapter-level tests with a mocked `@angular/core`
// import, see packages/media-picker/test/angular) since no Angular build/testing infra is
// configured in this package. `resolve.conditions: ['browser']` is required so Svelte's
// package exports resolve to its client build under Vitest/Node — without it, `mount()`
// resolves to Svelte's server-only build and throws `lifecycle_function_unavailable`.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { dev: true } }), vue()],
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
