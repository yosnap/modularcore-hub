import { getDefaultCanvasEnvironment } from './canvas-environment.js';

import type { CanvasEnvironment } from './canvas-environment.js';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  rect: CropRect;
  mimeType?: string;
  quality?: number;
}

function assertValidRect(rect: CropRect): void {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height)) {
    throw new Error('media-picker: crop rect width/height must be finite numbers');
  }
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error('media-picker: crop rect width/height must be positive');
  }
  if (rect.x < 0 || rect.y < 0) {
    throw new Error('media-picker: crop rect x/y must be >= 0');
  }
}

/**
 * Draws the `rect` region of `source` onto a canvas sized to the rect and re-encodes it.
 * `env` defaults to the browser's OffscreenCanvas; tests inject a node-canvas environment
 * so the pixels produced here are real, not asserted against a mocked return value.
 */
export async function cropImage(
  source: Blob,
  options: CropOptions,
  env: CanvasEnvironment = getDefaultCanvasEnvironment(),
): Promise<Blob> {
  const { rect, mimeType = 'image/png', quality } = options;
  assertValidRect(rect);

  const image = await env.loadImage(source);
  if (rect.x + rect.width > image.width || rect.y + rect.height > image.height) {
    throw new Error(
      `media-picker: crop rect (${rect.x},${rect.y},${rect.width}x${rect.height}) exceeds ` +
        `source image bounds (${image.width}x${image.height})`,
    );
  }

  const canvas = env.createCanvas(rect.width, rect.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('media-picker: unable to acquire a 2D canvas context');

  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

  return env.toBlob(canvas, mimeType, quality);
}
