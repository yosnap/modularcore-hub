/**
 * Framework-agnostic proxy logic for `/api/media/fetch-url`, kept free of SvelteKit-specific
 * imports so it is directly unit-testable — `+server.ts` is a thin adapter around this.
 *
 * Why this endpoint exists: a browser `fetch()` of an arbitrary third-party image URL is
 * subject to CORS, and almost no image host sends `Access-Control-Allow-Origin` — the request
 * fails in the browser no matter what the SSRF guard or `RemoteUrlLoader` do, because CORS is
 * a browser platform restriction, not something either can opt out of. Running the fetch here
 * (Node) sidesteps CORS entirely (server-to-server has none) AND is where
 * `core/net/ssrf-guard.ts`'s DNS/IP validation is actually enforceable — it no-ops in the
 * browser (see that module's doc comment: "Server-side callers ... are the primary threat
 * model here").
 */
import { fromRemoteUrl } from '@modularcore/media-picker/sources';

import type { RateLimiter } from './chat-rate-limiter';

const MAX_BYTES = 10 * 1024 * 1024;

export interface MediaFetchUrlDeps {
  clientIp: string;
  rateLimiter: RateLimiter;
  signal?: AbortSignal;
  /** Injectable for tests; defaults to the real `@modularcore/media-picker` fetch. */
  fetchRemote?: typeof fromRemoteUrl;
}

export interface MediaFetchUrlErrorResult {
  status: number;
  blob?: undefined;
  errorBody: { error: string };
}

export interface MediaFetchUrlSuccessResult {
  status: 200;
  blob: Blob;
  errorBody?: undefined;
}

export type MediaFetchUrlResult = MediaFetchUrlErrorResult | MediaFetchUrlSuccessResult;

export async function handleMediaFetchUrlRequest(
  rawUrl: string | null,
  deps: MediaFetchUrlDeps,
): Promise<MediaFetchUrlResult> {
  if (deps.rateLimiter.isRateLimited(deps.clientIp)) {
    return {
      status: 429,
      errorBody: { error: 'Too many requests. Please wait a moment before retrying.' },
    };
  }

  if (!rawUrl) {
    return { status: 400, errorBody: { error: 'Missing "url" query parameter.' } };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { status: 400, errorBody: { error: 'Invalid URL.' } };
  }

  const fetchRemote = deps.fetchRemote ?? fromRemoteUrl;
  try {
    const blob = await fetchRemote(parsed.toString(), { maxBytes: MAX_BYTES, signal: deps.signal });
    return { status: 200, blob };
  } catch (err) {
    // The SSRF guard's own error messages are already safe to show (they describe the
    // rejected URL/protocol, never server internals), so this is the one proxy in the app
    // that can forward `err.message` to the client instead of a generic string.
    return {
      status: 502,
      errorBody: { error: err instanceof Error ? err.message : 'Failed to fetch the remote URL.' },
    };
  }
}
