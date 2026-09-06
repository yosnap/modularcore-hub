import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { selectionAtVariant, variantUrl } from '../../core/format.js';

import type { LibraryItem } from '../../core/media-picker.js';
import type { ObjectVariant } from '../../core/provider.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const FILTERS = [
  'ui/react/VariantFilter.tsx',
  'ui/react/tailwind/VariantFilter.tsx',
  'ui/react/shadcn/VariantFilter.tsx',
  'ui/react/vanilla/VariantFilter.tsx',
  'ui/svelte/VariantFilter.svelte',
  'ui/svelte/tailwind/VariantFilter.svelte',
  'ui/svelte/shadcn/VariantFilter.svelte',
  'ui/svelte/vanilla/VariantFilter.svelte',
];

function variant(
  label: string,
  url: string,
  overrides: Partial<ObjectVariant> = {},
): ObjectVariant {
  return { label, key: `k-${label}`, url, size: 100, ...overrides };
}

function item(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    key: '2026/09/portada.png',
    url: 'https://cdn.example.com/original.png',
    size: 4000,
    ...overrides,
  };
}

describe('variantUrl', () => {
  it('devuelve la URL del tamaño pedido', () => {
    const withSizes = item({
      variants: [
        variant('medium', 'https://cdn.example.com/medium.png'),
        variant('thumb', 'https://cdn.example.com/thumb.png'),
      ],
    });

    expect(variantUrl(withSizes, 'medium')).toBe('https://cdn.example.com/medium.png');
  });

  it('recurre al original cuando ese tamaño no existe', () => {
    // El proveedor decide qué derivadas guarda, así que pedir una ausente es normal y debe dar
    // una imagen, no `undefined`.
    const withSizes = item({ variants: [variant('thumb', 'https://cdn.example.com/thumb.png')] });

    expect(variantUrl(withSizes, 'large')).toBe('https://cdn.example.com/original.png');
  });

  it('recurre al original cuando el objeto no tiene derivadas', () => {
    expect(variantUrl(item(), 'thumb')).toBe('https://cdn.example.com/original.png');
  });
});

describe('selectionAtVariant', () => {
  it('reescribe la URL de cada objeto y conserva el resto', () => {
    const selection = [
      item({ variants: [variant('medium', 'https://cdn.example.com/a-medium.png')] }),
      item({ key: 'otra.png', url: 'https://cdn.example.com/b.png' }),
    ];

    const resolved = selectionAtVariant(selection, 'medium');

    expect(resolved.map((entry) => entry.url)).toEqual([
      'https://cdn.example.com/a-medium.png',
      // Sin ese tamaño: se queda con su original.
      'https://cdn.example.com/b.png',
    ]);
    expect(resolved[0]?.key).toBe('2026/09/portada.png');
    expect(resolved[0]?.variants).toHaveLength(1);
  });

  it('trae también las medidas del tamaño pedido, no las del original', () => {
    // Llevarse sólo la URL maquetaría la miniatura en la caja de 1920 px del original.
    const selection = [
      item({
        width: 1920,
        height: 1080,
        size: 400_000,
        variants: [
          variant('thumb', 'https://cdn.example.com/thumb.png', {
            width: 400,
            height: 225,
            size: 9_000,
          }),
        ],
      }),
    ];

    const [resolved] = selectionAtVariant(selection, 'thumb');

    expect([resolved?.width, resolved?.height, resolved?.size]).toEqual([400, 225, 9_000]);
  });

  it('conserva las medidas del original cuando ese tamaño no existe', () => {
    const selection = [item({ width: 1920, height: 1080, size: 400_000 })];

    const [resolved] = selectionAtVariant(selection, 'thumb');

    expect([resolved?.width, resolved?.height, resolved?.size]).toEqual([1920, 1080, 400_000]);
  });

  it('descarta las medidas del original si el proveedor no informa de las de la derivada', () => {
    // No saber el ancho es correcto; decir 1920 sobre una miniatura de 400 no lo es.
    const selection = [
      item({
        width: 1920,
        height: 1080,
        variants: [variant('thumb', 'https://cdn.example.com/thumb.png', { size: 9_000 })],
      }),
    ];

    const [resolved] = selectionAtVariant(selection, 'thumb');

    expect(resolved?.url).toBe('https://cdn.example.com/thumb.png');
    expect(resolved?.size).toBe(9_000);
    expect(resolved?.width).toBeUndefined();
    expect(resolved?.height).toBeUndefined();
  });

  it('no muta la selección recibida', () => {
    const original = item({ variants: [variant('thumb', 'https://cdn.example.com/t.png')] });

    selectionAtVariant([original], 'thumb');

    expect(original.url).toBe('https://cdn.example.com/original.png');
  });

  it('tolera una selección vacía', () => {
    expect(selectionAtVariant([], 'thumb')).toEqual([]);
  });
});

describe('las ocho presentaciones de VariantFilter', () => {
  it('ofrecen las mismas tres clases de opción y devuelven undefined para «todos»', async () => {
    for (const filter of FILTERS) {
      const source = await readFile(join(packageRoot, filter), 'utf8');

      expect(source, `${filter} debe ofrecer «todos los tamaños»`).toContain('All sizes');
      expect(source, `${filter} debe ofrecer el filtro de originales`).toContain(
        'Without derived sizes',
      );
      expect(source, `${filter} debe usar el valor 'none' del contrato`).toContain("'none'");
      // Sin esto, `ListOptions.variant` viajaría como cadena vacía en lugar de omitirse.
      expect(source, `${filter} debe devolver undefined al limpiar el filtro`).toContain(
        '|| undefined',
      );
    }
  });
});
