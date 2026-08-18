import { loadImage } from 'canvas';
import { describe, expect, it } from 'vitest';

import { cropImage } from '../../core/canvas/crop.js';
import { createNodeCanvasEnvironment } from '../helpers/node-canvas-environment.js';
import { createQuadrantImageBlob } from '../helpers/synthetic-image.js';

const env = createNodeCanvasEnvironment();

describe('cropImage (real pixels via node-canvas — AD6, not mocked)', () => {
  it('produces a Blob with the exact crop dimensions', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await cropImage(source, { rect: { x: 0, y: 0, width: 100, height: 50 } }, env);

    expect(result).toBeInstanceOf(Blob);
    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    expect(decoded.width).toBe(100);
    expect(decoded.height).toBe(50);
  });

  it('crops the correct region — top-left quadrant is red', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await cropImage(source, { rect: { x: 0, y: 0, width: 100, height: 50 } }, env);

    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    const { createCanvas } = await import('canvas');
    const sample = createCanvas(decoded.width, decoded.height);
    const ctx = sample.getContext('2d');
    ctx.drawImage(decoded, 0, 0);
    const [r, g, b] = ctx.getImageData(10, 10, 1, 1).data;
    expect([r, g, b]).toEqual([255, 0, 0]);
  });

  it('crops the correct region — bottom-right quadrant is yellow', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await cropImage(
      source,
      { rect: { x: 100, y: 50, width: 100, height: 50 } },
      env,
    );

    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    const { createCanvas } = await import('canvas');
    const sample = createCanvas(decoded.width, decoded.height);
    const ctx = sample.getContext('2d');
    ctx.drawImage(decoded, 0, 0);
    const [r, g, b] = ctx.getImageData(10, 10, 1, 1).data;
    expect([r, g, b]).toEqual([255, 255, 0]);
  });

  it('rejects a rect that exceeds the source bounds', async () => {
    const source = createQuadrantImageBlob(200, 100);
    await expect(
      cropImage(source, { rect: { x: 150, y: 0, width: 100, height: 50 } }, env),
    ).rejects.toThrow(/exceeds source image bounds/);
  });

  it('rejects a non-positive rect', async () => {
    const source = createQuadrantImageBlob(200, 100);
    await expect(
      cropImage(source, { rect: { x: 0, y: 0, width: 0, height: 50 } }, env),
    ).rejects.toThrow(/must be positive/);
  });

  it('throws a clear error when called without an explicit env outside a browser', async () => {
    const source = createQuadrantImageBlob(10, 10);
    await expect(cropImage(source, { rect: { x: 0, y: 0, width: 5, height: 5 } })).rejects.toThrow(
      /Canvas API is not available/,
    );
  });
});
