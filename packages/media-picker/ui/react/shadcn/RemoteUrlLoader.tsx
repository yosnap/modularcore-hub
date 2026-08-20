import { useState } from 'react';

import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../shadcn-theme.css';

export interface RemoteUrlLoaderProps {
  picker: UseMediaPickerResult;
  allowHttp?: boolean;
  maxBytes?: number;
  /** See the headless RemoteUrlLoader for why this must resolve to an absolute, same-origin
   * proxy URL (browser CORS + SSRF guard rationale) — that contract is unchanged here. */
  resolveUrl?: (url: string) => string;
}

/** Shadcn variant of RemoteUrlLoader — same props/behavior as headless. */
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
      <label className="flex flex-col gap-1 text-sm text-foreground">
        Image URL
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/image.png"
          className="min-w-64 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <button
        type="button"
        onClick={() => void handleLoad()}
        disabled={loading || url.trim() === ''}
        className="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent disabled:opacity-50"
      >
        Load from URL
      </button>
      {picker.state.error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {picker.state.error.message}
        </p>
      ) : null}
    </div>
  );
}
