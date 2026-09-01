// @ts-check
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.svelte-kit/**',
      '**/coverage/**',
      '**/node_modules/**',
      // Raw copy-code source for consuming projects' own Svelte toolchain (no svelte-eslint-parser
      // installed here — this monorepo's own build/typecheck never compiles these directly either,
      // see packages/media-picker/tsconfig.json).
      '**/*.svelte',
      // No parser de Astro instalado en este monorepo (mismo motivo que .svelte arriba).
      '**/*.astro',
      'apps/docs/.astro/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/web/src/**', 'fixtures/*/src/**'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    // core/ is isomorphic (browser primitives like OffscreenCanvas + a Node-only DNS guard
    // behind a runtime feature check), so it gets both global sets.
    files: ['packages/media-picker/{core,adapters,test}/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    // core/ai-chat is isomorphic (fetch/ReadableStream/AbortController/crypto are shared, but
    // `localStorage` in core/history/local.ts and DOM projection in adapters/web are browser
    // primitives), so it gets both global sets like media-picker above.
    files: ['packages/ai-chat/{core,adapters,ui,test}/**'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  eslintConfigPrettier,
);
