import { assertSafeRemoteUrl } from './net/ssrf-guard.js';

import type { ResolvedAddress } from './net/ssrf-guard.js';
import type { StorageProvider } from './provider.js';

export interface RemoteUrlSourceOptions {
  allowHttp?: boolean;
  /** Download cap; exceeding it (via Content-Length or streamed bytes) aborts the fetch. */
  maxBytes?: number;
  signal?: AbortSignal;
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

/** Local source: the browser already gave us the bytes, nothing to fetch or validate. */
export function fromLocalFile(file: File): Blob {
  return file;
}

async function readBodyWithCap(response: Response, maxBytes: number): Promise<Blob> {
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      throw new Error(`media-picker: remote file exceeds maxBytes (${maxBytes})`);
    }
    return new Blob([buffer], { type: contentType });
  }

  const chunks: BlobPart[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`media-picker: remote file exceeds maxBytes (${maxBytes})`);
      }
      // Copy into a plain ArrayBuffer-backed view: the stream's Uint8Array is typed against
      // ArrayBufferLike (which admits SharedArrayBuffer), not the narrower BlobPart contract.
      chunks.push(new Uint8Array(value));
    }
  }
  return new Blob(chunks, { type: contentType });
}

/**
 * Node's `dns.lookup`-style callback is overloaded: undici's connector always calls it as
 * `(hostname, options, callback)` and, by default, requests `options.all: true` (Happy
 * Eyeballs / `autoSelectFamily`) — in that shape the callback expects `(err, addresses[])`
 * with each entry `{address, family}`, NOT the single-address `(err, address, family)` form.
 * Only handling the latter silently breaks every real connection (undici receives
 * `address: undefined`), verified against a live `undici` connect against a real socket.
 */
export function pinnedLookup(address: ResolvedAddress) {
  return (
    _hostname: string,
    lookupOptions: { all?: boolean },
    callback: (
      err: NodeJS.ErrnoException | null,
      addressOrList: string | { address: string; family: number }[],
      family?: number,
    ) => void,
  ): void => {
    if (lookupOptions.all) {
      callback(null, [{ address: address.address, family: address.family }]);
    } else {
      callback(null, address.address, address.family);
    }
  };
}

export type PinnedFetch = { fetch: typeof fetch; dispatcher: unknown } | undefined;

/**
 * Pins the actual TCP connection to one of the addresses `assertSafeRemoteUrl` already
 * validated, instead of letting `fetch` re-resolve the hostname itself. Without this, an
 * attacker's nameserver can answer a public IP for the validation lookup and a private one
 * (DNS rebinding) moments later for the connection `fetch` opens — the guard would pass but
 * the request would still reach an internal address. TLS is unaffected: undici still uses the
 * URL's original hostname for SNI/certificate verification, only the socket's destination IP
 * is overridden. Node-only (undici); there is no equivalent for a browser's native fetch.
 *
 * Node's global `fetch` bundles its own internal copy of undici, which is not guaranteed to
 * be wire-compatible with a separately installed `undici` package's `Agent` (mixing the two
 * throws `InvalidArgumentError: invalid onRequestStart method` — verified against Node
 * 22.23.1 + undici@8.10.0). So this returns the `fetch` function from the SAME `undici`
 * import as the `Agent`, and the caller must use that paired `fetch`, not the global one.
 *
 * `undici` is intentionally NOT listed in this component's copy-code `dependencies`
 * (`modularcore.json`) — most consumers of this browser-facing component never touch this
 * path (`isNode` is false client-side, and `undici` ships in Node itself), so forcing every
 * React/Svelte project to install a Node-only package would be dead weight. Server-side
 * callers that want IP pinning should add `undici` to their own project; without it, this
 * falls back to the global unpinned fetch (still protocol/range-checked, just not
 * rebinding-proof) with a console warning rather than breaking the build. The bundler-ignore
 * comments below stop Vite/webpack from trying to statically resolve/bundle a package that
 * legitimately may not be installed.
 */
async function pinnedFetch(address: ResolvedAddress): Promise<PinnedFetch> {
  const isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
  if (!isNode) return undefined;
  try {
    const undici = await import(/* @vite-ignore */ /* webpackIgnore: true */ 'undici');
    const dispatcher = new undici.Agent({ connect: { lookup: pinnedLookup(address) } });
    return { fetch: undici.fetch as unknown as typeof fetch, dispatcher };
  } catch {
    console.warn(
      'media-picker: "undici" is not installed — the remote-URL fetch will not be pinned to ' +
        'its validated IP, which reopens a narrow DNS-rebinding window. Install "undici" in ' +
        'your server project to close it.',
    );
    return undefined;
  }
}

/**
 * SA5: validates protocol + resolved address before fetching, disables automatic redirect
 * following (a redirect to a private address would otherwise bypass the check), pins the
 * connection to the validated address (see `pinnedFetch`), and caps the downloaded size.
 * See `core/net/ssrf-guard.ts` for the full threat model/limitations.
 */
export async function fromRemoteUrl(
  url: string,
  options: RemoteUrlSourceOptions = {},
): Promise<Blob> {
  const { allowHttp = false, maxBytes = DEFAULT_MAX_BYTES, signal } = options;
  const parsed = new URL(url);
  const addresses = await assertSafeRemoteUrl(parsed, { allowHttp });
  const pinned = addresses[0] ? await pinnedFetch(addresses[0]) : undefined;
  const doFetch = pinned?.fetch ?? fetch;

  try {
    const response = await doFetch(parsed, {
      redirect: 'manual',
      signal,
      ...(pinned ? { dispatcher: pinned.dispatcher } : {}),
    } as RequestInit);
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      throw new Error(
        'media-picker: remote URL responded with a redirect; redirects are not followed ' +
          'automatically (SSRF guard) — resolve the final URL and re-validate it explicitly',
      );
    }
    if (!response.ok) {
      throw new Error(`media-picker: failed to fetch remote URL (status ${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength !== null && Number(contentLength) > maxBytes) {
      throw new Error(`media-picker: remote file exceeds maxBytes (${maxBytes})`);
    }

    return await readBodyWithCap(response, maxBytes);
  } finally {
    // A pinned Agent owns its own keep-alive connection pool; the request/response above is
    // fully drained by the time we get here (or has failed), so nothing else will use it —
    // leaving it open would leak a socket/pool per remote-URL load in a long-running server.
    await (pinned?.dispatcher as { close?: () => Promise<void> })?.close?.().catch(() => undefined);
  }
}

/** Library source: list/select an existing object from the configured storage provider. */
export async function fromLibrary(provider: StorageProvider, key: string): Promise<Blob> {
  const url = provider.getUrl(key);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `media-picker: failed to load library object "${key}" (status ${response.status})`,
    );
  }
  return response.blob();
}
