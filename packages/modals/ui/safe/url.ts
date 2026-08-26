// Provider output (`OverlayButton.url`, `ModalConfig.imageUrl`) is untrusted content — see
// core/provider.ts's docstring. These helpers are the actual security boundary applied by
// ui/react and ui/svelte before anything reaches href/src.

const ALLOWED_HREF_SCHEMES = new Set(['https:', 'http:', 'mailto:', 'tel:']);
const MAX_DATA_URI_LENGTH = 200_000; // ~150KB decoded; keeps a runaway data: URI out of the DOM

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// A same-app relative path (`/pricing`, `pricing`) has no scheme at all, so it can't be a
// `javascript:`/`data:` disguise — `new URL()` just can't parse it without a base (Code Review
// Finding, Critical: the previous no-base `new URL(url)` call threw on every relative input and
// was silently swallowed by `parseUrl`, so a config's `primaryButton.url: '/pricing'` rejected
// the whole href and the CTA stopped navigating). Resolve against a fixed dummy origin purely to
// validate shape (rejects malformed input, and protocol-relative `//evil.com` which would
// resolve to an arbitrary host) — no `window`/SSR dependency needed since the dummy origin never
// leaves this check. The ORIGINAL relative string is returned as-is so the link stays relative
// in the DOM rather than being rewritten to an absolute URL.
function isSafeRelativePath(url: string): boolean {
  // Root-relative only ("/pricing"), not protocol-relative ("//evil.com" resolves to an
  // arbitrary host) and not a scheme-less bare segment ("not a url" would otherwise parse fine
  // against the dummy base too, which is far looser than the finding's actual failure scenario
  // requires) — this narrows relative acceptance to exactly the in-app-link shape being fixed.
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  try {
    new URL(url, 'https://modularcore.invalid');
    return true;
  } catch {
    return false;
  }
}

/** Allowlist for link/button `href`: https/http/mailto/tel only, or a same-app relative path. Rejects `javascript:`, `data:`, and anything else. */
export function safeHref(url?: string): string | undefined {
  if (!url) return undefined;
  const parsed = parseUrl(url);
  if (parsed) return ALLOWED_HREF_SCHEMES.has(parsed.protocol) ? parsed.toString() : undefined;
  return isSafeRelativePath(url) ? url : undefined;
}

/** Allowlist for `<img src>`: https or a same-app relative path, plus size-capped `data:` opt-in. Rejects `javascript:` and anything else. */
export function safeImageSrc(
  url?: string,
  options: { allowData?: boolean } = {},
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) {
    if (!options.allowData) return undefined;
    return url.length <= MAX_DATA_URI_LENGTH ? url : undefined;
  }
  const parsed = parseUrl(url);
  if (parsed) return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  return isSafeRelativePath(url) ? url : undefined;
}
