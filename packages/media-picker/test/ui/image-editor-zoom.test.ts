import { describe, expect, it } from 'vitest';

import { applyZoom as applyZoomHeadless } from '../../ui/react/ImageEditor.js';
import { applyZoom as applyZoomTailwind } from '../../ui/react/tailwind/ImageEditor.js';
import { applyZoom as applyZoomShadcn } from '../../ui/react/shadcn/ImageEditor.js';
import { applyZoom as applyZoomVanilla } from '../../ui/react/vanilla/ImageEditor.js';

const VARIANTS = [
  ['headless', applyZoomHeadless],
  ['tailwind', applyZoomTailwind],
  ['shadcn', applyZoomShadcn],
  ['vanilla', applyZoomVanilla],
] as const;

describe.each(VARIANTS)(
  'applyZoom (crop rect ↔ zoom slider mapping) — %s variant',
  (_name, applyZoom) => {
    it('returns the rect unchanged at zoom 1', () => {
      const rect = { x: 10, y: 20, width: 100, height: 60 };
      expect(applyZoom(rect, 1)).toEqual(rect);
    });

    it('narrows the rect toward its own center as zoom increases', () => {
      const rect = { x: 0, y: 0, width: 100, height: 60 };
      expect(applyZoom(rect, 2)).toEqual({ x: 25, y: 15, width: 50, height: 30 });
    });

    it('keeps the crop rect center fixed regardless of the rect origin', () => {
      const rect = { x: 40, y: 40, width: 100, height: 100 };
      const zoomed = applyZoom(rect, 4);
      const originalCenter = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      const zoomedCenter = { x: zoomed.x + zoomed.width / 2, y: zoomed.y + zoomed.height / 2 };
      expect(zoomedCenter).toEqual(originalCenter);
    });
  },
);
