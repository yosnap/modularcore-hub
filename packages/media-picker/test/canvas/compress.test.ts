import { loadImage } from 'canvas';
import { describe, expect, it } from 'vitest';

import { compressImage } from '../../core/canvas/compress.js';
import { createNodeCanvasEnvironment } from '../helpers/node-canvas-environment.js';
import { createNoiseImageBlob, createQuadrantImageBlob } from '../helpers/synthetic-image.js';

const env = createNodeCanvasEnvironment();

describe('compressImage (real pixels via node-canvas — AD6, not mocked)', () => {
  it('downscales to maxDimension while preserving aspect ratio', async () => {
    const source = createQuadrantImageBlob(400, 200);
    const result = await compressImage(source, { maxDimension: 100 }, env);

    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    expect(decoded.width).toBe(100);
    expect(decoded.height).toBe(50);
  });

  it('never upscales when maxDimension is larger than the source', async () => {
    const source = createQuadrantImageBlob(100, 50);
    const result = await compressImage(source, { maxDimension: 1000 }, env);

    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    expect(decoded.width).toBe(100);
    expect(decoded.height).toBe(50);
  });

  it('lowering quality strictly reduces JPEG byte size for the same image', async () => {
    const source = createNoiseImageBlob(400, 300);
    const high = await compressImage(source, { mimeType: 'image/jpeg', quality: 0.95 }, env);
    const low = await compressImage(source, { mimeType: 'image/jpeg', quality: 0.2 }, env);

    expect(low.size).toBeLessThan(high.size);
  });

  it('steps quality down until maxBytes is met (or bottoms out at minQuality)', async () => {
    const source = createNoiseImageBlob(400, 300);
    const unconstrained = await compressImage(
      source,
      { mimeType: 'image/jpeg', quality: 0.95 },
      env,
    );
    const maxBytes = Math.floor(unconstrained.size / 2);
    const result = await compressImage(
      source,
      { mimeType: 'image/jpeg', quality: 0.95, maxBytes, minQuality: 0.1 },
      env,
    );

    expect(result.size).toBeLessThan(unconstrained.size);
    expect(result.size).toBeLessThanOrEqual(maxBytes);
  });

  it('throws a clear error when called without an explicit env outside a browser', async () => {
    const source = createQuadrantImageBlob(10, 10);
    await expect(compressImage(source)).rejects.toThrow(/Canvas API is not available/);
  });
});
