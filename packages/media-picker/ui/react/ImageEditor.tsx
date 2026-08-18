import { useEffect, useState } from 'react';

import type { JSX } from 'react';
import type { AspectRatio, CropRect } from '../../core/canvas/crop.js';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';

export interface ImageEditorProps {
  picker: UseMediaPickerResult;
}

const ASPECT_PRESETS: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

/** Zoom narrows the crop rect toward its own center (zoom 2 = crop the middle half); it never
 * touches image pixels directly — `applyZoom` is the only place that translates the zoom
 * slider into the rect actually sent to `picker.crop()`, so the preview's `scale()` transform
 * and the applied crop always agree on what "zoomed in" means. */
export function applyZoom(rect: CropRect, zoom: number): CropRect {
  const width = rect.width / zoom;
  const height = rect.height / zoom;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

/**
 * Minimal, unstyled controls for the rotate/flip/zoom/crop pipeline: each action calls the
 * corresponding `picker` method directly (rotate()/flip() apply immediately; the crop rect
 * is only sent on "Apply crop", composing on top of whatever rotate/flip already produced —
 * same order a user would expect: straighten first, then frame).
 */
export function ImageEditor({ picker }: ImageEditorProps): JSX.Element {
  const [aspect, setAspect] = useState<AspectRatio>('free');
  const [zoom, setZoom] = useState(1);
  const [rect, setRect] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const { blob, status, error } = picker.state;

  // Blob URLs are process-wide handles the browser won't reclaim on its own; without this
  // effect a new one was minted on every render (every keystroke on width/height, every zoom
  // tick) and never revoked, leaking one object URL per interaction for the life of the tab.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const handleApplyCrop = (): void => {
    void picker.crop({ rect: applyZoom(rect, zoom), aspect });
  };

  return (
    <div>
      <div>
        <button type="button" onClick={() => void picker.rotate('ccw')}>
          Rotate left
        </button>
        <button type="button" onClick={() => void picker.rotate('cw')}>
          Rotate right
        </button>
        <button type="button" onClick={() => void picker.flip('horizontal')}>
          Flip horizontal
        </button>
        <button type="button" onClick={() => void picker.flip('vertical')}>
          Flip vertical
        </button>
      </div>
      <div>
        <label>
          Aspect ratio
          <select value={aspect} onChange={(event) => setAspect(event.target.value as AspectRatio)}>
            {ASPECT_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zoom
          <input
            type="range"
            min={1}
            max={4}
            step={0.1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <label>
          Width
          <input
            type="number"
            value={rect.width}
            onChange={(event) => setRect({ ...rect, width: Number(event.target.value) })}
          />
        </label>
        <label>
          Height
          <input
            type="number"
            value={rect.height}
            onChange={(event) => setRect({ ...rect, height: Number(event.target.value) })}
          />
        </label>
        <button type="button" onClick={handleApplyCrop} disabled={status !== 'idle'}>
          Apply crop
        </button>
      </div>
      {error ? <p role="alert">{error.message}</p> : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Editor preview"
          style={{ transform: `scale(${zoom})`, maxWidth: '100%' }}
        />
      ) : null}
    </div>
  );
}
