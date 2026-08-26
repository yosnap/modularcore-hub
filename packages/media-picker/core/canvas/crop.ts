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

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Minimum crop rect width/height in pixels, enforced by `resizeCropRect` — see its contract. */
const MIN_RECT_SIZE = 1;

/**
 * Pure pointer-drag resize math for the 8 interactive crop handles: given the handle being
 * dragged and how far the pointer moved (`delta`, in the same pixel space as `rect`/`bounds`),
 * returns the new rect. Only the edge(s) named by `handle` move (e.g. `'e'` only moves the
 * right edge; `'se'` moves both the right and bottom edges); the opposite edge(s) stay fixed,
 * matching how every reference crop UI (this included) anchors a resize.
 *
 * Contract (explicit — Red Team Finding, High): a handle can never be dragged past its own
 * opposite edge. Both bounds-clamping and this anti-inversion clamp enforce a minimum
 * `MIN_RECT_SIZE`-px width/height in the direction being resized, so the result always
 * satisfies `crop.ts`'s own `assertValidRect` (`width > 0 && height > 0`) — the handle being
 * dragged is clamped, its identity/direction is never flipped.
 *
 * When `aspect` resolves to a locked ratio (a preset or a numeric custom ratio), the dimension
 * not directly driven by the dragged handle is recomputed from it — corner handles keep the
 * opposite corner anchored, single-axis edge handles (`n`/`s`/`e`/`w`) grow/shrink the other
 * axis around the rect's own center — then the result is clamped to `bounds` and the
 * minimum-size floor again, which can override the exact target ratio right at the image edge
 * (same trade-off `applyAspectRatio` already makes for `cropImage`).
 */
export function resizeCropRect(
  rect: CropRect,
  handle: CropHandle,
  delta: { dx: number; dy: number },
  bounds: { width: number; height: number },
  aspect?: AspectRatio,
): CropRect {
  const affectsLeft = handle.includes('w');
  const affectsRight = handle.includes('e');
  const affectsTop = handle.includes('n');
  const affectsBottom = handle.includes('s');

  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (affectsLeft) left += delta.dx;
  if (affectsRight) right += delta.dx;
  if (affectsTop) top += delta.dy;
  if (affectsBottom) bottom += delta.dy;

  const clampToBounds = (): void => {
    left = Math.min(Math.max(left, 0), bounds.width);
    right = Math.min(Math.max(right, 0), bounds.width);
    top = Math.min(Math.max(top, 0), bounds.height);
    bottom = Math.min(Math.max(bottom, 0), bounds.height);
  };
  clampToBounds();

  // Anti-inversion clamp: the dragged edge can approach but never cross its fixed opposite —
  // clamp it to `MIN_RECT_SIZE` short of the opposite edge instead of letting it pass through
  // (which would flip which side is "left"/"right" or "top"/"bottom").
  if (affectsLeft && !affectsRight) left = Math.min(left, right - MIN_RECT_SIZE);
  if (affectsRight && !affectsLeft) right = Math.max(right, left + MIN_RECT_SIZE);
  if (affectsTop && !affectsBottom) top = Math.min(top, bottom - MIN_RECT_SIZE);
  if (affectsBottom && !affectsTop) bottom = Math.max(bottom, top + MIN_RECT_SIZE);

  const ratio = resolveAspectRatio(aspect);
  if (ratio !== null && ratio > 0) {
    const draggedHorizontally = affectsLeft || affectsRight;
    const draggedVertically = affectsTop || affectsBottom;

    if (draggedHorizontally) {
      const width = right - left;
      const height = width / ratio;
      if (affectsTop && !affectsBottom) {
        top = bottom - height;
      } else if (affectsBottom && !affectsTop) {
        bottom = top + height;
      } else {
        const centerY = rect.y + rect.height / 2;
        top = centerY - height / 2;
        bottom = centerY + height / 2;
      }
    } else if (draggedVertically) {
      const height = bottom - top;
      const width = height * ratio;
      const centerX = rect.x + rect.width / 2;
      left = centerX - width / 2;
      right = centerX + width / 2;
    }

    clampToBounds();
    if (right - left < MIN_RECT_SIZE) {
      if (affectsRight) right = left + MIN_RECT_SIZE;
      else left = right - MIN_RECT_SIZE;
    }
    if (bottom - top < MIN_RECT_SIZE) {
      if (affectsBottom) bottom = top + MIN_RECT_SIZE;
      else top = bottom - MIN_RECT_SIZE;
    }
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
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
