import { loadImage } from 'canvas';
import { describe, expect, it } from 'vitest';

import { generateVariants } from '../../core/canvas/variants.js';
import { createNodeCanvasEnvironment } from '../helpers/node-canvas-environment.js';
import { createQuadrantImageBlob } from '../helpers/synthetic-image.js';

const env = createNodeCanvasEnvironment();

const SIZES = [
  { label: 'large', maxDimension: 1920 },
  { label: 'medium', maxDimension: 1200 },
  { label: 'thumb', maxDimension: 400 },
];

async function decode(blob: Blob) {
  return loadImage(Buffer.from(await blob.arrayBuffer()));
}

describe('generateVariants (píxeles reales con node-canvas)', () => {
  it('genera un tamaño por cada medida menor que el original', async () => {
    const source = createQuadrantImageBlob(2000, 1000);

    const variants = await generateVariants(source, { sizes: SIZES }, env);

    expect(variants.map((variant) => variant.label)).toEqual(['large', 'medium', 'thumb']);
  });

  it('nunca escala hacia arriba: omite las medidas mayores que el original', async () => {
    // Un original de 800px no puede producir un "large" de 1920 sin inventar píxeles: saldría
    // una copia borrosa y más pesada que la fuente.
    const source = createQuadrantImageBlob(800, 400);

    const variants = await generateVariants(source, { sizes: SIZES }, env);

    expect(variants.map((variant) => variant.label)).toEqual(['thumb']);
  });

  it('devuelve las dimensiones reales de cada tamaño, con la proporción intacta', async () => {
    const source = createQuadrantImageBlob(2000, 1000);

    const [large] = await generateVariants(source, { sizes: [SIZES[0]!] }, env);
    const decoded = await decode(large!.blob);

    expect([large!.width, large!.height]).toEqual([1920, 960]);
    expect([decoded.width, decoded.height]).toEqual([1920, 960]);
  });

  it('ordena de mayor a menor aunque las medidas lleguen desordenadas', async () => {
    const source = createQuadrantImageBlob(2000, 1000);

    const variants = await generateVariants(
      source,
      { sizes: [SIZES[2]!, SIZES[0]!, SIZES[1]!] },
      env,
    );

    expect(variants.map((variant) => variant.label)).toEqual(['large', 'medium', 'thumb']);
  });

  it('conserva el formato del original cuando no se indica otro', async () => {
    // El helper produce PNG; recomprimirlo a JPEG por defecto destruiría su transparencia.
    const source = createQuadrantImageBlob(1000, 500);

    const [variant] = await generateVariants(source, { sizes: [SIZES[2]!] }, env);

    expect(variant!.blob.type).toBe('image/png');
  });

  it('permite fijar el formato de salida por juego y por medida', async () => {
    const source = createQuadrantImageBlob(1000, 500);

    const [porJuego] = await generateVariants(
      source,
      { sizes: [SIZES[2]!], mimeType: 'image/jpeg' },
      env,
    );
    const [porMedida] = await generateVariants(
      source,
      { sizes: [{ ...SIZES[2]!, mimeType: 'image/jpeg' }] },
      env,
    );

    expect(porJuego!.blob.type).toBe('image/jpeg');
    expect(porMedida!.blob.type).toBe('image/jpeg');
  });

  it('devuelve una lista vacía si ninguna medida es menor que el original', async () => {
    const source = createQuadrantImageBlob(200, 100);

    const variants = await generateVariants(source, { sizes: [SIZES[0]!] }, env);

    expect(variants).toEqual([]);
  });

  it('aborta en cuanto se cancela la señal', async () => {
    const source = createQuadrantImageBlob(2000, 1000);
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateVariants(source, { sizes: SIZES, signal: controller.signal }, env),
    ).rejects.toThrow();
  });
});
