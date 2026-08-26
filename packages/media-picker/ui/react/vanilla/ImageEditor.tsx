import { useEffect, useState } from 'react';

import type { JSX } from 'react';
import type { AspectRatio, CropRect } from '../../../core/canvas/crop.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../vanilla-styles.css';

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

/** Vanilla CSS variant of ImageEditor — same props/behavior as headless. */
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
    <div className="mc-editor">
      <div className="mc-editor__controls">
        {ASPECT_PRESETS.map((preset) => (
          <label key={preset}>
            <input
              type="radio"
              name="mc-aspect"
              checked={aspect === preset}
              onChange={() => setAspect(preset)}
            />
            {preset}
          </label>
        ))}
      </div>
      <div className="mc-editor__actions">
        <button type="button" onClick={() => picker.rotate('ccw')} className="mc-button">
          Rotate left
        </button>
        <button type="button" onClick={() => picker.rotate('cw')} className="mc-button">
          Rotate right
        </button>
        <button type="button" onClick={() => picker.flip('horizontal')} className="mc-button">
          Flip horizontal
        </button>
        <button type="button" onClick={() => picker.flip('vertical')} className="mc-button">
          Flip vertical
        </button>
      </div>
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
      <button type="button" onClick={applyCrop} disabled={status !== 'idle'} className="mc-button">
        Apply crop
      </button>
      {error ? (
        <p role="alert" className="mc-alert">
          {error.message}
        </p>
      ) : null}
      {previewUrl ? (
        <div className="mc-editor__preview">
          <img
            src={previewUrl}
            alt="Editor preview"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          />
        </div>
      ) : null}
    </div>
  );
}
