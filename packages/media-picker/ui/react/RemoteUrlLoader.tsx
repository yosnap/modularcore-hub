import { useState } from 'react';

import type { JSX } from 'react';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';

export interface RemoteUrlLoaderProps {
  picker: UseMediaPickerResult;
  /** Forwarded to `picker.loadFromUrl` — e.g. `{ allowHttp: false, maxBytes }`. */
  allowHttp?: boolean;
  maxBytes?: number;
  /**
   * A browser `fetch()` of an arbitrary third-party URL is subject to CORS: most image hosts
   * never send `Access-Control-Allow-Origin`, so the request fails in the browser regardless
   * of anything this component or the SSRF guard does — that's a browser platform restriction,
   * not something client-side code can opt out of. `resolveUrl` lets the app rewrite the typed
   * URL into a same-origin server proxy (e.g. `/api/media/fetch-url?url=...`) that runs
   * `fromRemoteUrl` server-side, where the SSRF guard's DNS/IP checks are also fully active
   * (they no-op in the browser — see `core/net/ssrf-guard.ts`). Defaults to the identity
   * function, matching the pre-proxy behavior.
   */
  resolveUrl?: (url: string) => string;
}

/**
 * Plain text input + button for `picker.loadFromUrl()` (SSRF-guarded remote fetch — see
 * `core/sources.ts`). No business logic here beyond the loading flag: this only forwards the
 * typed URL to the core, which does the actual protocol/IP/redirect validation and
 * DNS-rebinding-safe fetch.
 */
export function RemoteUrlLoader({
  picker,
  allowHttp,
  maxBytes,
  resolveUrl = (value) => value,
}: RemoteUrlLoaderProps): JSX.Element {
  const [url, setUrl] = useState('');
  // `picker.state.status` stays `'idle'` throughout `loadFromUrl()` (it's not a crop/compress/
  // upload step — see `core/media-picker.ts`), so it can't tell us a fetch is in flight. Track
  // it locally instead of misreading `status`, otherwise a double-click fires two concurrent
  // fetches.
  const [loading, setLoading] = useState(false);
  const { error } = picker.state;

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
    <div>
      <label>
        Image URL
        <input
          type="url"
          value={url}
          placeholder="https://example.com/image.png"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={() => void handleLoad()}
        disabled={loading || url.trim() === ''}
      >
        Load from URL
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  );
}
