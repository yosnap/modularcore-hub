/**
 * `crop.ts`/`compress.ts` never touch `OffscreenCanvas`/`createImageBitmap` directly.
 * They go through this small structural interface instead, for two independent reasons:
 * 1) SSR/Node guard — `getDefaultCanvasEnvironment()` throws a clear error instead of a
 *    cryptic `ReferenceError` when those globals don't exist.
 * 2) Real (not phantom) tests — Vitest runs on Node, which has neither a real
 *    `OffscreenCanvas` nor `createImageBitmap`. Tests inject a `node-canvas`-backed
 *    environment (see `test/helpers/node-canvas-environment.ts`) that draws real pixels
 *    through the same `crop()`/`compress()` code path, instead of mocking the output.
 */
export interface DrawableImage {
  readonly width: number;
  readonly height: number;
}

export interface Canvas2DContext {
  drawImage(
    image: DrawableImage,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
  /**
   * Transform primitives used by `canvas/transform.ts` (rotate/flip). Both real
   * implementations behind this structural interface — the browser's OffscreenCanvas 2D
   * context and `node-canvas`'s context — implement the standard Canvas2D transform API, so
   * this only widens the type surface already available at runtime; it adds no new behavior.
   */
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angleRadians: number): void;
  scale(x: number, y: number): void;
}

export interface CanvasHandle {
  readonly width: number;
  readonly height: number;
  getContext(kind: '2d'): Canvas2DContext | null;
}

export interface CanvasEnvironment {
  readonly name: string;
  createCanvas(width: number, height: number): CanvasHandle;
  loadImage(source: Blob): Promise<DrawableImage>;
  toBlob(canvas: CanvasHandle, mimeType: string, quality?: number): Promise<Blob>;
}

export function getDefaultCanvasEnvironment(): CanvasEnvironment {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    throw new Error(
      'media-picker: Canvas API is not available in this environment (SSR/Node). ' +
        'crop()/compress() must run client-side, or be called with an explicit ' +
        'CanvasEnvironment (see core/canvas/canvas-environment.ts).',
    );
  }
  return {
    name: 'offscreen-canvas',
    createCanvas(width, height) {
      return new OffscreenCanvas(width, height) as unknown as CanvasHandle;
    },
    loadImage(source) {
      return createImageBitmap(source);
    },
    toBlob(canvas, mimeType, quality) {
      return (canvas as unknown as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
    },
  };
}
