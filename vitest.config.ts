import { defineConfig } from 'vitest/config';

// Config raíz: cubre el modo workspace cuando no hay proyectos con config
// propia (Fase 1). Los packages añaden su propio vitest.config con
// environment: 'jsdom' donde necesiten DOM/canvas (React/Svelte, Fase 4/5).
export default defineConfig({
  test: {
    passWithNoTests: true,
  },
});
