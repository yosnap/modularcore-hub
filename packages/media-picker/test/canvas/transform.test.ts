import { createCanvas, loadImage } from 'canvas';
import { describe, expect, it } from 'vitest';

import { flip, rotate90 } from '../../core/canvas/transform.js';
import { createNodeCanvasEnvironment } from '../helpers/node-canvas-environment.js';
import { createQuadrantImageBlob } from '../helpers/synthetic-image.js';

const env = createNodeCanvasEnvironment();

async function samplePixel(blob: Blob, x: number, y: number): Promise<[number, number, number]> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  const decoded = await loadImage(buffer);
  const sample = createCanvas(decoded.width, decoded.height);
  const ctx = sample.getContext('2d');
  ctx.drawImage(decoded, 0, 0);
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  return [r, g, b];
}

// 200x100 quadrant blob: red=top-left, green=top-right, blue=bottom-left, yellow=bottom-right.
const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];

describe('rotate90 (real pixels via node-canvas — AD6, not mocked)', () => {
  it('swaps width/height', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await rotate90(source, 'cw', {}, env);
    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    expect(decoded.width).toBe(100);
    expect(decoded.height).toBe(200);
  });

  it('cw: the source top-left (red) quadrant ends up in the top-right of the result', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await rotate90(source, 'cw', {}, env);
    // Derived from the rotation matrix used in rotate90(): source (10,10) -> dest (90,10).
    expect(await samplePixel(result, 90, 10)).toEqual(RED);
  });

  it('ccw: the source top-right (green) quadrant ends up in the top-left of the result', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await rotate90(source, 'ccw', {}, env);
    expect(await samplePixel(result, 10, 10)).toEqual(GREEN);
  });

  it('rotating cw then ccw restores the original orientation', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const rotated = await rotate90(source, 'cw', {}, env);
    const restored = await rotate90(rotated, 'ccw', {}, env);
    expect(await samplePixel(restored, 10, 10)).toEqual(RED);
  });
});

describe('flip (real pixels via node-canvas — AD6, not mocked)', () => {
  it('preserves the original dimensions', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await flip(source, 'horizontal', {}, env);
    const buffer = Buffer.from(await result.arrayBuffer());
    const decoded = await loadImage(buffer);
    expect(decoded.width).toBe(200);
    expect(decoded.height).toBe(100);
  });

  it('horizontal: the top-left (red) and top-right (green) quadrants swap', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await flip(source, 'horizontal', {}, env);
    expect(await samplePixel(result, 10, 10)).toEqual(GREEN);
    expect(await samplePixel(result, 190, 10)).toEqual(RED);
  });

  it('vertical: the top-left (red) and bottom-left (blue) quadrants swap', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const result = await flip(source, 'vertical', {}, env);
    expect(await samplePixel(result, 10, 10)).toEqual(BLUE);
    expect(await samplePixel(result, 10, 90)).toEqual(RED);
  });

  it('flipping horizontal twice restores the original orientation', async () => {
    const source = createQuadrantImageBlob(200, 100);
    const flipped = await flip(source, 'horizontal', {}, env);
    const restored = await flip(flipped, 'horizontal', {}, env);
    expect(await samplePixel(restored, 10, 10)).toEqual(RED);
  });
});
