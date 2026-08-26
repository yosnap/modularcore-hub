import { loadImage } from 'canvas';
import { describe, expect, it } from 'vitest';

import { cropImage, resizeCropRect } from '../../core/canvas/crop.js';
import { createNodeCanvasEnvironment } from '../helpers/node-canvas-environment.js';
import { createQuadrantImageBlob } from '../helpers/synthetic-image.js';

import type { CropHandle } from '../../core/canvas/crop.js';

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

  describe('aspect ratio presets', () => {
    it('"1:1" recomputes height from width, producing a square crop', async () => {
      const source = createQuadrantImageBlob(200, 100);
      const result = await cropImage(
        source,
        { rect: { x: 0, y: 0, width: 80, height: 50 }, aspect: '1:1' },
        env,
      );
      const buffer = Buffer.from(await result.arrayBuffer());
      const decoded = await loadImage(buffer);
      expect(decoded.width).toBe(80);
      expect(decoded.height).toBe(80);
    });

    it('a numeric ratio is honored directly', async () => {
      const source = createQuadrantImageBlob(200, 100);
      const result = await cropImage(
        source,
        { rect: { x: 0, y: 0, width: 40, height: 999 }, aspect: 2 },
        env,
      );
      const buffer = Buffer.from(await result.arrayBuffer());
      const decoded = await loadImage(buffer);
      expect(decoded.width).toBe(40);
      expect(decoded.height).toBe(20);
    });

    it('clamps the recomputed rect to the source bounds instead of throwing', async () => {
      const source = createQuadrantImageBlob(200, 100);
      // width=200 at x=0 with a 1:1 ratio would need height=200, but the source is only 100 tall.
      const result = await cropImage(
        source,
        { rect: { x: 0, y: 0, width: 200, height: 10 }, aspect: '1:1' },
        env,
      );
      const buffer = Buffer.from(await result.arrayBuffer());
      const decoded = await loadImage(buffer);
      expect(decoded.width).toBe(decoded.height);
      expect(decoded.height).toBeLessThanOrEqual(100);
    });

    it('"free" (the default) uses rect as-is, unchanged from pre-v2 behavior', async () => {
      const source = createQuadrantImageBlob(200, 100);
      const result = await cropImage(
        source,
        { rect: { x: 0, y: 0, width: 30, height: 70 }, aspect: 'free' },
        env,
      );
      const buffer = Buffer.from(await result.arrayBuffer());
      const decoded = await loadImage(buffer);
      expect(decoded.width).toBe(30);
      expect(decoded.height).toBe(70);
    });
  });

  describe('resizeCropRect (interactive handle drag math — pure, no canvas)', () => {
    const rect = { x: 20, y: 20, width: 100, height: 60 };
    const bounds = { width: 200, height: 100 };

    const EDGE_CASES: Array<[CropHandle, { dx: number; dy: number }, Partial<typeof rect>]> = [
      ['n', { dx: 0, dy: 10 }, { y: 30, height: 50 }],
      ['s', { dx: 0, dy: 10 }, { height: 70 }],
      ['e', { dx: 10, dy: 0 }, { width: 110 }],
      ['w', { dx: -10, dy: 0 }, { x: 10, width: 110 }],
      ['ne', { dx: 10, dy: -10 }, { y: 10, width: 110, height: 70 }],
      ['nw', { dx: -10, dy: -10 }, { x: 10, y: 10, width: 110, height: 70 }],
      ['se', { dx: 10, dy: 10 }, { width: 110, height: 70 }],
      ['sw', { dx: -10, dy: 10 }, { x: 10, width: 110, height: 70 }],
    ];

    it.each(EDGE_CASES)('handle %s moves only its own edge(s)', (handle, delta, expected) => {
      const result = resizeCropRect(rect, handle, delta, bounds);
      expect(result).toEqual({ ...rect, ...expected });
    });

    it('clamps a handle drag to the bounds instead of exceeding them', () => {
      const result = resizeCropRect(rect, 'e', { dx: 1000, dy: 0 }, bounds);
      expect(result.x + result.width).toBeLessThanOrEqual(bounds.width);
      expect(result).toEqual({ x: 20, y: 20, width: 180, height: 60 });
    });

    it('clamps a top/left drag past 0 instead of producing a negative origin', () => {
      const result = resizeCropRect(rect, 'nw', { dx: -1000, dy: -1000 }, bounds);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('never inverts handle identity when dragged past its own opposite handle (Red Team Finding, High)', () => {
      // Dragging 'e' (right edge) far enough left to cross the fixed left edge (x=20) must clamp
      // to a 1px-minimum width, not flip which edge is "left" vs "right".
      const result = resizeCropRect(rect, 'e', { dx: -1000, dy: 0 }, bounds);
      expect(result.x).toBe(20);
      expect(result.width).toBe(1);
      expect(result.width).toBeGreaterThan(0);

      const invertedTop = resizeCropRect(rect, 's', { dx: 0, dy: -1000 }, bounds);
      expect(invertedTop.y).toBe(20);
      expect(invertedTop.height).toBe(1);
      expect(invertedTop.height).toBeGreaterThan(0);
    });

    it('a corner drag past its opposite corner on both axes still yields a valid positive rect', () => {
      const result = resizeCropRect(rect, 'se', { dx: -1000, dy: -1000 }, bounds);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(() =>
        cropImage(createQuadrantImageBlob(200, 100), { rect: result }, env),
      ).not.toThrow();
    });

    it('respects a locked preset aspect ratio, adjusting the non-dragged dimension proportionally', () => {
      const result = resizeCropRect(rect, 'e', { dx: -20, dy: 0 }, bounds, '1:1');
      expect(result.width).toBe(80);
      expect(result.height).toBe(80);
    });

    it('respects a locked custom numeric aspect ratio on a vertical-only drag', () => {
      const result = resizeCropRect(rect, 's', { dx: 0, dy: 10 }, bounds, 2);
      expect(result.height).toBe(70);
      expect(result.width).toBe(140);
    });

    it('keeps the opposite corner anchored when a corner drag is aspect-locked', () => {
      const result = resizeCropRect(rect, 'nw', { dx: -10, dy: 0 }, bounds, '1:1');
      // Opposite corner (bottom-right) must stay exactly where it started.
      expect(result.x + result.width).toBe(rect.x + rect.width);
      expect(result.y + result.height).toBe(rect.y + rect.height);
    });
  });
});
