// Provider output (`OverlayButton.url`, `ModalConfig.imageUrl`) is untrusted content — see
// core/provider.ts's docstring. These helpers are the actual security boundary applied by
// ui/react and ui/svelte before anything reaches href/src.

const ALLOWED_HREF_SCHEMES = new Set(['https:', 'http:', 'mailto:', 'tel:']);
const MAX_DATA_URI_LENGTH = 200_000; // ~150KB decoded; keeps a runaway data: URI out of the DOM

function parseUrl(url: string): URL | null {
  try {
    // A base is required to resolve scheme-relative/relative inputs consistently; those are
    // rejected below anyway since they won't produce an allowed scheme when resolved this way
    // unless they already are one of the allowed absolute schemes.
    return new URL(url);
  } catch {
    return null;
  }
}

/** Allowlist for link/button `href`: https/http/mailto/tel only. Rejects `javascript:`, `data:`, and anything else. */
export function safeHref(url?: string): string | undefined {
  if (!url) return undefined;
  const parsed = parseUrl(url);
  if (!parsed || !ALLOWED_HREF_SCHEMES.has(parsed.protocol)) return undefined;
  return parsed.toString();
}

/** Allowlist for `<img src>`: https only, plus size-capped `data:` opt-in. Rejects `javascript:` and anything else. */
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
  if (!parsed || parsed.protocol !== 'https:') return undefined;
  return parsed.toString();
}
