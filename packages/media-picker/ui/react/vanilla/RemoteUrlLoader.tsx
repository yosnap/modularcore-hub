import { useState } from 'react';

import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../vanilla-styles.css';

export interface RemoteUrlLoaderProps {
  picker: UseMediaPickerResult;
  allowHttp?: boolean;
  maxBytes?: number;
  /** See the headless RemoteUrlLoader for why this must resolve to an absolute, same-origin
   * proxy URL (browser CORS + SSRF guard rationale) — that contract is unchanged here. */
  resolveUrl?: (url: string) => string;
}

/** Vanilla CSS variant of RemoteUrlLoader — same props/behavior as headless. */
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
    <div className="mc-field">
      <label>
        Image URL
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/image.png"
          className="mc-input"
        />
      </label>
      <button
        type="button"
        onClick={() => void handleLoad()}
        disabled={loading || url.trim() === ''}
        className="mc-button"
      >
        Load from URL
      </button>
      {picker.state.error ? (
        <p role="alert" className="mc-alert">
          {picker.state.error.message}
        </p>
      ) : null}
    </div>
  );
}
