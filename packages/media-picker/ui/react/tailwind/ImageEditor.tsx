import { useEffect, useState } from 'react';

import type { JSX } from 'react';
import type { AspectRatio, CropRect } from '../../../core/canvas/crop.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

export interface ImageEditorProps {
  picker: UseMediaPickerResult;
}

const ASPECT_PRESETS: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

/** Same zoom math as the headless variant — purely numeric, no UI concerns, must stay
 * byte-identical across variants so `picker.crop()` always receives the rect the preview shows. */
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

/** Tailwind variant of ImageEditor — same props/behavior as headless, styled with utilities. */
export function ImageEditor({ picker }: ImageEditorProps): JSX.Element {
  const [aspect, setAspect] = useState<AspectRatio>('free');
  const [zoom, setZoom] = useState(1);
  const [rect, setRect] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const { blob, status, error } = picker.state;

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

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    createImageBitmap(blob)
      .then((bitmap) => {
        if (cancelled) return;
        setRect({ x: 0, y: 0, width: bitmap.width, height: bitmap.height });
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const applyCrop = (): void => {
    void picker.crop({ rect: applyZoom(rect, zoom), aspect });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {ASPECT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAspect(preset)}
            className={`rounded-full border px-3 py-1 text-xs ${
              aspect === preset
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => picker.rotate('ccw')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          ⟲ Rotate left
        </button>
        <button
          type="button"
          onClick={() => picker.rotate('cw')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          ⟳ Rotate right
        </button>
        <button
          type="button"
          onClick={() => picker.flip('horizontal')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          ⇋ Flip H
        </button>
        <button
          type="button"
          onClick={() => picker.flip('vertical')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          ⇅ Flip V
        </button>
      </div>
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Zoom — {zoom.toFixed(1)}×
        <input
          type="range"
          min={1}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="accent-zinc-900"
        />
      </label>
      <button
        type="button"
        onClick={applyCrop}
        disabled={status !== 'idle'}
        className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        Apply crop
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      ) : null}
      {previewUrl ? (
        <div className="max-h-[70vh] max-w-full overflow-hidden rounded-md border border-zinc-200">
          <img
            src={previewUrl}
            alt="Editor preview"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            className="block max-w-full"
          />
        </div>
      ) : null}
    </div>
  );
}
