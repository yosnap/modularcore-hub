import { useState } from 'react';

import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

export interface RemoteUrlLoaderProps {
  picker: UseMediaPickerResult;
  allowHttp?: boolean;
  maxBytes?: number;
  /** See the headless RemoteUrlLoader for why this must resolve to an absolute, same-origin
   * proxy URL (browser CORS + SSRF guard rationale) — that contract is unchanged here. */
  resolveUrl?: (url: string) => string;
}

/** Tailwind variant of RemoteUrlLoader — same props/behavior as headless, styled as a form row. */
export function RemoteUrlLoader({
  picker,
  allowHttp,
  maxBytes,
  resolveUrl = (value: string) => value,
}: RemoteUrlLoaderProps): JSX.Element {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoad = async (): Promise<void> => {
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      await picker.loadFromUrl(resolveUrl(trimmed), { allowHttp, maxBytes });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Image URL
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/image.png"
          className="min-w-64 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="button"
        onClick={() => void handleLoad()}
        disabled={loading || url.trim() === ''}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        Load from URL
      </button>
      {picker.state.error ? (
        <p role="alert" className="w-full text-sm text-red-600">
          {picker.state.error.message}
        </p>
      ) : null}
    </div>
  );
}
