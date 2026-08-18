import { createCanvas, loadImage } from 'canvas';

import type { Canvas, Image } from 'canvas';
import type {
  CanvasEnvironment,
  CanvasHandle,
  DrawableImage,
} from '../../core/canvas/canvas-environment.js';

/**
 * AD6: jsdom does not render a real Canvas and Node has no OffscreenCanvas, so a "canvas
 * mock" would not exercise real pixel math. This wraps `node-canvas` (native Cairo bindings,
 * chosen over Playwright's browser mode to avoid downloading a ~300MB Chromium binary in a
 * sandboxed CI-like environment) behind the same `CanvasEnvironment` contract crop()/
 * compress() use in the browser, so tests exercise real drawImage/encode calls.
 */
export function createNodeCanvasEnvironment(): CanvasEnvironment {
  return {
    name: 'node-canvas',
    createCanvas(width, height): CanvasHandle {
      const canvas = createCanvas(width, height);
      return canvas as unknown as CanvasHandle;
    },
    async loadImage(source: Blob): Promise<DrawableImage> {
      const buffer = Buffer.from(await source.arrayBuffer());
      const image: Image = await loadImage(buffer);
      return image;
    },
    async toBlob(canvasHandle: CanvasHandle, mimeType: string, quality?: number): Promise<Blob> {
      const canvas = canvasHandle as unknown as Canvas;
      const buffer =
        mimeType === 'image/jpeg'
          ? canvas.toBuffer('image/jpeg', { quality: quality ?? 0.92 })
          : canvas.toBuffer('image/png');
      return new Blob([buffer], { type: mimeType });
    },
  };
}
