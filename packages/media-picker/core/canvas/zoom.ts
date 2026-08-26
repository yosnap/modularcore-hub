import type { CropRect } from './crop.js';

/**
 * Narrows `rect` toward its own center as `factor` increases (`factor` 2 = crop the middle
 * half) — pure math shared by every ImageEditor UI variant so the zoom slider and the crop
 * rect actually sent to `cropImage()` always agree on what "zoomed in" means. It never touches
 * image pixels directly.
 *
 * Extracted here (Phase 3) from 4 near-identical Svelte-local copies to close a coverage gap:
 * `test/ui/image-editor-zoom.test.ts` only ever exercised the React variants' `applyZoom`
 * (`ui/react/**\/ImageEditor.tsx`), never Svelte's. `test/canvas/zoom.test.ts` mirrors that
 * suite against this shared module; all 4 Svelte `ImageEditor` variants import it instead of
 * redefining it locally.
 */
export function applyZoom(rect: CropRect, factor: number): CropRect {
  const width = rect.width / factor;
  const height = rect.height / factor;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}
