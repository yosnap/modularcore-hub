<script lang="ts">
  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';

  let {
    picker,
    allowHttp,
    maxBytes,
    resolveUrl = (value: string) => value,
  }: {
    picker: MediaPickerRune;
    allowHttp?: boolean;
    maxBytes?: number;
    /**
     * A browser `fetch()` of an arbitrary third-party URL is subject to CORS: most image hosts
     * never send `Access-Control-Allow-Origin`, so the request fails in the browser regardless
     * of anything this component or the SSRF guard does — that's a browser platform
     * restriction. `resolveUrl` lets the app rewrite the typed URL into a same-origin server
     * proxy (e.g. `/api/media/fetch-url?url=...`) that runs `fromRemoteUrl` server-side, where
     * the SSRF guard's DNS/IP checks are also fully active (they no-op in the browser).
     *
     * MUST return an absolute URL — `fromRemoteUrl` does `new URL(url)` with no base, so a
     * relative path throws `TypeError: Invalid URL`. Build it with `window.location.origin`.
     * The proxy target itself is same-origin/trusted, so pass `allowHttp` alongside this if
     * the app can run over plain http (e.g. local dev) — the real SSRF validation happens
     * server-side against the actual attacker-controlled URL, not against this proxy call.
     */
    resolveUrl?: (url: string) => string;
  } = $props();

  let url = $state('');
  // `picker.state.status` stays `'idle'` throughout `loadFromUrl()` (it's not a crop/compress/
  // upload step), so it can't tell us a fetch is in flight — track it locally instead,
  // otherwise a double-click fires two concurrent fetches.
  let loading = $state(false);

  /** "Parses as a URL" — any scheme accepted here; the SSRF guard applies the real restriction. */
  function isParsableUrl(value: string): boolean {
    if (!value) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  const valid = $derived(isParsableUrl(url.trim()));

  async function handleLoad(): Promise<void> {
    const trimmed = url.trim();
    if (!isParsableUrl(trimmed) || loading) return;
    loading = true;
    try {
      await picker.loadFromUrl(resolveUrl(trimmed), { allowHttp, maxBytes });
    } finally {
      loading = false;
    }
  }
</script>

<!--
  Deliberately unstyled: structure + ARIA only, no CSS framework — this package ships
  headless-first with minimal reference UI. Restyle freely.
-->
<div>
  <label>
    URL de la imagen
    <span aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
      </svg>
    </span>
    <input type="url" bind:value={url} placeholder="https://example.com/image.png" />
  </label>
  <button type="button" onclick={() => void handleLoad()} disabled={loading || !valid}>
    Usar esta URL
  </button>
  {#if picker.state.error}
    <p role="alert">{picker.state.error.message}</p>
  {/if}
</div>
