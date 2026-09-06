import { describe, expect, it, vi } from 'vitest';

import { MediaPicker } from '../core/media-picker.js';

import type { GeneratedVariant } from '../core/canvas/variants.js';
import type { StorageProvider, UploadOptions } from '../core/provider.js';

const SIZES = [
  { label: 'medium', maxDimension: 1200 },
  { label: 'thumb', maxDimension: 400 },
];

function createProvider(): StorageProvider & { calls: { blob: Blob; options?: UploadOptions }[] } {
  const calls: { blob: Blob; options?: UploadOptions }[] = [];

  return {
    calls,
    async upload(blob, options) {
      calls.push({ blob, options });
      const key = options?.variantLabel ? `key-${options.variantLabel}` : 'key-original';
      return {
        key,
        url: `https://cdn.example.com/${key}`,
        size: blob.size,
        contentType: 'image/png',
      };
    },
    async list() {
      return { items: [] };
    },
    async remove() {},
    getUrl: (key) => `https://cdn.example.com/${key}`,
  };
}

function createPicker(generated: GeneratedVariant[]) {
  const generateVariants = vi.fn(async () => generated);
  const picker = new MediaPicker({ generateVariants });
  picker.loadLocalFile(new Blob(['original']) as File);
  return { picker, generateVariants };
}

function variant(label: string): GeneratedVariant {
  return { label, blob: new Blob([label]), width: 100, height: 50 };
}

describe('MediaPicker.uploadWithVariants', () => {
  it('sube el original y enlaza cada tamaño con su clave', async () => {
    const provider = createProvider();
    const { picker } = createPicker([variant('medium'), variant('thumb')]);

    const result = await picker.uploadWithVariants(provider, SIZES);

    expect(result.original.key).toBe('key-original');
    expect(result.variants.map((entry) => entry.label)).toEqual(['medium', 'thumb']);
    expect(result.failed).toEqual([]);

    // La primera subida es el original y no lleva marcas de variante; las demás apuntan a él.
    expect(provider.calls[0]?.options?.variantOf).toBeUndefined();
    expect(provider.calls[1]?.options).toMatchObject({
      variantOf: 'key-original',
      variantLabel: 'medium',
    });
    expect(provider.calls[2]?.options).toMatchObject({
      variantOf: 'key-original',
      variantLabel: 'thumb',
    });
  });

  it('genera los tamaños a partir del blob original, no del ya subido', async () => {
    const provider = createProvider();
    const source = new Blob(['original']) as File;
    const generateVariants = vi.fn(async () => [variant('thumb')]);
    const picker = new MediaPicker({ generateVariants });
    picker.loadLocalFile(source);

    await picker.uploadWithVariants(provider, SIZES);

    expect(generateVariants).toHaveBeenCalledTimes(1);
    expect(generateVariants.mock.calls[0]?.[0]).toBe(source);
  });

  it('un tamaño que falla al subirse no arrastra al original ni a los demás', async () => {
    const provider = createProvider();
    const original = provider.upload.bind(provider);
    let llamada = 0;
    provider.upload = async (blob, options) => {
      llamada += 1;
      // La segunda llamada es la primera variante.
      if (llamada === 2) throw new Error('almacenamiento caído');
      return original(blob, options);
    };
    const { picker } = createPicker([variant('medium'), variant('thumb')]);

    const result = await picker.uploadWithVariants(provider, SIZES);

    expect(result.original.key).toBe('key-original');
    expect(result.variants.map((entry) => entry.label)).toEqual(['thumb']);
    expect(result.failed.map((entry) => entry.label)).toEqual(['medium']);
    expect(result.failed[0]?.error.message).toBe('almacenamiento caído');
  });

  it('si la generación falla entera, el original se conserva y se informa de cada tamaño', async () => {
    const provider = createProvider();
    const generateVariants = vi.fn(async () => {
      throw new Error('sin canvas');
    });
    const picker = new MediaPicker({ generateVariants });
    picker.loadLocalFile(new Blob(['original']) as File);

    const result = await picker.uploadWithVariants(provider, SIZES);

    expect(result.original.key).toBe('key-original');
    expect(result.variants).toEqual([]);
    expect(result.failed.map((entry) => entry.label)).toEqual(['medium', 'thumb']);
  });

  it('falla claramente si no hay ninguna imagen cargada', async () => {
    const provider = createProvider();
    const picker = new MediaPicker();

    await expect(picker.uploadWithVariants(provider, SIZES)).rejects.toThrow(
      'uploadWithVariants() called with no source loaded',
    );
  });

  it('deja el estado en done, como una subida normal', async () => {
    const provider = createProvider();
    const { picker } = createPicker([variant('thumb')]);

    await picker.uploadWithVariants(provider, SIZES);

    expect(picker.getState().status).toBe('done');
    expect(picker.getState().result?.key).toBe('key-original');
  });
});
