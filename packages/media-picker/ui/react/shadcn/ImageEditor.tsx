import { useEffect, useState } from 'react';

import * as SliderPrimitive from '@radix-ui/react-slider';

import type { JSX } from 'react';
import type { AspectRatio, CropRect } from '../../../core/canvas/crop.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../shadcn-theme.css';

export interface ImageEditorProps {
  picker: UseMediaPickerResult;
}

const ASPECT_PRESETS: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

/** Same zoom math as the headless variant — must stay identical across variants. */
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

/** Shadcn variant of ImageEditor — same props/behavior as headless. The zoom control is a real
 * `@radix-ui/react-slider` (not an `<input type="range">`), matching what `npx shadcn add
 * slider` generates. Requires `@radix-ui/react-slider` as a peer dependency. */
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
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-foreground hover:bg-accent'
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
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          ⟲ Rotate left
        </button>
        <button
          type="button"
          onClick={() => picker.rotate('cw')}
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          ⟳ Rotate right
        </button>
        <button
          type="button"
          onClick={() => picker.flip('horizontal')}
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          ⇋ Flip H
        </button>
        <button
          type="button"
          onClick={() => picker.flip('vertical')}
          className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
        >
          ⇅ Flip V
        </button>
      </div>
      <label className="flex flex-col gap-2 text-sm text-foreground">
        Zoom — {zoom.toFixed(1)}×
        <SliderPrimitive.Root
          value={[zoom]}
          onValueChange={([next]) => setZoom(next ?? zoom)}
          min={1}
          max={4}
          step={0.1}
          className="relative flex h-5 w-full touch-none items-center"
        >
          <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </SliderPrimitive.Root>
      </label>
      <button
        type="button"
        onClick={applyCrop}
        disabled={status !== 'idle'}
        className="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        Apply crop
      </button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      {previewUrl ? (
        <div className="max-h-[70vh] max-w-full overflow-hidden rounded-md border border-border">
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
