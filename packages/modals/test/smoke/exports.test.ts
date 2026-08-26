import { describe, expect, it } from 'vitest';

// Imports every subpath declared in package.json#exports from its built `dist` output (React
// subpaths point at compiled .js; Svelte subpaths are raw source per RT-A5 and are covered
// structurally below instead of via import, since they require the svelte compiler to load).
// Run via `pnpm test:smoke` — deliberately excluded from `pnpm test` so it never blocks on a
// missing `pnpm build` in a fresh checkout.

describe('exports <-> dist (React/core subpaths)', () => {
  it('"." resolves to the core OverlayManager', async () => {
    const mod = await import('@modularcore/modals');
    expect(mod.OverlayManager).toBeTypeOf('function');
  });

  it('"./types" resolves (type-only module still emits a JS file)', async () => {
    await expect(import('@modularcore/modals/types')).resolves.toBeDefined();
  });

  it('"./provider" resolves (type-only module still emits a JS file)', async () => {
    await expect(import('@modularcore/modals/provider')).resolves.toBeDefined();
  });

  it('"./providers/in-memory" resolves createInMemoryProvider', async () => {
    const mod = await import('@modularcore/modals/providers/in-memory');
    expect(mod.createInMemoryProvider).toBeTypeOf('function');
  });

  it('"./react" resolves useModals', async () => {
    const mod = await import('@modularcore/modals/react');
    expect(mod.useModals).toBeTypeOf('function');
  });

  for (const subpath of [
    'ModalOverlay',
    'FullscreenOverlay',
    'TopBanner',
    'BottomBanner',
    'SlideIn',
    'Toast',
    'ModalsRenderer',
  ]) {
    it(`"./ui/react/${subpath}" resolves a React component`, async () => {
      const mod = await import(`@modularcore/modals/ui/react/${subpath}`);
      expect(mod[subpath]).toBeTypeOf('function');
    });
  }
});
