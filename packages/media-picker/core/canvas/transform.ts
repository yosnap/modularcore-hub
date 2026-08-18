import { getDefaultCanvasEnvironment } from './canvas-environment.js';

import type { CanvasEnvironment } from './canvas-environment.js';

export type RotateDirection = 'cw' | 'ccw';
export type FlipAxis = 'horizontal' | 'vertical';

export interface TransformOptions {
  mimeType?: string;
  quality?: number;
}

/**
 * Rotates `source` 90° clockwise or counter-clockwise. The output canvas swaps width/height
 * (a 90° turn exchanges the axes), and the image is drawn centered around the rotated
 * origin — same `CanvasEnvironment` seam as crop()/compress(), so tests exercise real pixels
 * via `node-canvas` instead of a mocked return value.
 */
export async function rotate90(
  source: Blob,
  direction: RotateDirection,
  options: TransformOptions = {},
  env: CanvasEnvironment = getDefaultCanvasEnvironment(),
): Promise<Blob> {
  const { mimeType = 'image/png', quality } = options;
  const image = await env.loadImage(source);
  const canvas = env.createCanvas(image.height, image.width);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('media-picker: unable to acquire a 2D canvas context');

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((direction === 'cw' ? 1 : -1) * (Math.PI / 2));
  ctx.drawImage(
    image,
    0,
    0,
    image.width,
    image.height,
    -image.width / 2,
    -image.height / 2,
    image.width,
    image.height,
  );
  ctx.restore();

  return env.toBlob(canvas, mimeType, quality);
}

/** Mirrors `source` across the given axis, preserving its original dimensions. */
export async function flip(
  source: Blob,
  axis: FlipAxis,
  options: TransformOptions = {},
  env: CanvasEnvironment = getDefaultCanvasEnvironment(),
): Promise<Blob> {
  const { mimeType = 'image/png', quality } = options;
  const image = await env.loadImage(source);
  const canvas = env.createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('media-picker: unable to acquire a 2D canvas context');

  ctx.save();
  if (axis === 'horizontal') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, image.width, image.height);
  ctx.restore();

  return env.toBlob(canvas, mimeType, quality);
}
