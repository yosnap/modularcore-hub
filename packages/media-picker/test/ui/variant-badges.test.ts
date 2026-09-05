import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { formatVariantBadge, sortVariants } from '../../core/format.js';

import type { ObjectVariant } from '../../core/provider.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const GRIDS = [
  'ui/svelte/MediaLibraryGrid.svelte',
  'ui/svelte/tailwind/MediaLibraryGrid.svelte',
  'ui/svelte/shadcn/MediaLibraryGrid.svelte',
  'ui/svelte/vanilla/MediaLibraryGrid.svelte',
];

function variant(overrides: Partial<ObjectVariant>): ObjectVariant {
  return { label: 'thumb', key: 'k', url: 'u', size: 100, ...overrides };
}

describe('sortVariants', () => {
  it('ordena de mayor a menor por ancho, sea cual sea el orden de entrada', () => {
    const sorted = sortVariants([
      variant({ label: 'thumb', width: 400 }),
      variant({ label: 'large', width: 1920 }),
      variant({ label: 'medium', width: 1200 }),
    ]);

    expect(sorted.map((entry) => entry.label)).toEqual(['large', 'medium', 'thumb']);
  });

  it('recurre al peso cuando el proveedor no informa del ancho', () => {
    const sorted = sortVariants([
      variant({ label: 'pequeña', size: 100 }),
      variant({ label: 'grande', size: 900 }),
    ]);

    expect(sorted.map((entry) => entry.label)).toEqual(['grande', 'pequeña']);
  });

  it('no muta la lista recibida', () => {
    const original = [
      variant({ label: 'thumb', width: 400 }),
      variant({ label: 'large', width: 1920 }),
    ];

    sortVariants(original);

    expect(original.map((entry) => entry.label)).toEqual(['thumb', 'large']);
  });

  it('tolera la ausencia de variantes', () => {
    expect(sortVariants()).toEqual([]);
    expect(sortVariants([])).toEqual([]);
  });
});

describe('formatVariantBadge', () => {
  it('muestra el ancho cuando el proveedor lo conoce', () => {
    expect(formatVariantBadge(variant({ width: 1200 }))).toBe('1200');
  });

  it('cae en la etiqueta, lo único que el contrato garantiza', () => {
    expect(formatVariantBadge(variant({ label: 'thumb' }))).toBe('thumb');
  });
});

describe('las cuatro presentaciones de MediaLibraryGrid', () => {
  it('pintan los tamaños con las mismas funciones compartidas', async () => {
    for (const grid of GRIDS) {
      const source = await readFile(join(packageRoot, grid), 'utf8');

      expect(source, `${grid} debe importar los helpers de core/format`).toContain(
        'formatVariantBadge',
      );
      expect(source, `${grid} debe ordenar antes de pintar`).toContain(
        'sortVariants(item.variants)',
      );
    }
  });
});
