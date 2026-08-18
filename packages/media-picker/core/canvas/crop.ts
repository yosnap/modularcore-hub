import { getDefaultCanvasEnvironment } from './canvas-environment.js';

import type { CanvasEnvironment } from './canvas-environment.js';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AspectRatioPreset = 'free' | '1:1' | '16:9' | '4:3' | '3:2';
export type AspectRatio = AspectRatioPreset | number;

export interface CropOptions {
  rect: CropRect;
  /**
   * When set to anything but `'free'`, `rect` is treated as a starting point (its `x`/`y`
   * and `width` are kept, `height` is recomputed from the ratio) rather than the exact crop
   * area, then clamped to fit inside the source image. `'free'` (the default) uses `rect`
   * as-is, matching the pre-existing behavior.
   */
  aspect?: AspectRatio;
  mimeType?: string;
  quality?: number;
}

const ASPECT_RATIO_PRESETS: Record<Exclude<AspectRatioPreset, 'free'>, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
};

/** Resolves an `AspectRatio` to a numeric width/height ratio, or `null` for `'free'`. */
export function resolveAspectRatio(aspect: AspectRatio | undefined): number | null {
  if (aspect === undefined || aspect === 'free') return null;
  return typeof aspect === 'number' ? aspect : ASPECT_RATIO_PRESETS[aspect];
}

/**
 * Recomputes `rect`'s height from `ratio` (keeping `x`/`y`/`width`), then clamps the result
 * to fit inside `imageWidth`x`imageHeight` — shrinking width if the recomputed height would
 * overflow, and vice versa, always preserving the target ratio.
 */
export function applyAspectRatio(
  rect: CropRect,
  ratio: number,
  imageWidth: number,
  imageHeight: number,
): CropRect {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error('media-picker: aspect ratio must be a positive finite number');
  }
  let { width, height } = rect;
  const { x, y } = rect;
  height = width / ratio;
  if (y + height > imageHeight) {
    height = imageHeight - y;
    width = height * ratio;
  }
  if (x + width > imageWidth) {
    width = imageWidth - x;
    height = width / ratio;
  }
  return { x, y, width, height };
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
  const { mimeType = 'image/png', quality } = options;
  assertValidRect(options.rect);

  const image = await env.loadImage(source);
  const ratio = resolveAspectRatio(options.aspect);
  const rect =
    ratio === null
      ? options.rect
      : applyAspectRatio(options.rect, ratio, image.width, image.height);
  assertValidRect(rect);
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
