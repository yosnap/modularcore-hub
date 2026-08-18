import { getDefaultCanvasEnvironment } from './canvas-environment.js';

import type { CanvasEnvironment } from './canvas-environment.js';

export interface CompressOptions {
  mimeType?: string;
  /** Initial encode quality (0-1). Ignored by lossless formats such as PNG. */
  quality?: number;
  /** Longest-side cap in pixels; the image is downscaled (never upscaled) to fit. */
  maxDimension?: number;
  /** Target output size in bytes. Quality is stepped down until this is met or `minQuality` is hit. */
  maxBytes?: number;
  minQuality?: number;
}

function resolveDimensions(
  width: number,
  height: number,
  maxDimension?: number,
): { width: number; height: number } {
  if (!maxDimension || Math.max(width, height) <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Re-encodes `source`, optionally downscaling and stepping quality down until `maxBytes`
 * is met. `env` defaults to the browser's OffscreenCanvas; see crop.ts for why tests use
 * an injected node-canvas environment instead of mocking the result.
 */
export async function compressImage(
  source: Blob,
  options: CompressOptions = {},
  env: CanvasEnvironment = getDefaultCanvasEnvironment(),
): Promise<Blob> {
  const { mimeType = 'image/jpeg', maxDimension, maxBytes, minQuality = 0.1 } = options;
  let quality = options.quality ?? 0.92;

  const image = await env.loadImage(source);
  const { width, height } = resolveDimensions(image.width, image.height, maxDimension);

  const canvas = env.createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('media-picker: unable to acquire a 2D canvas context');
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);

  let blob = await env.toBlob(canvas, mimeType, quality);
  if (!maxBytes) return blob;

  while (blob.size > maxBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.1);
    blob = await env.toBlob(canvas, mimeType, quality);
  }
  return blob;
}
