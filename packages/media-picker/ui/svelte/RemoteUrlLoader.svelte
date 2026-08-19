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

  async function handleLoad(): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    loading = true;
    try {
      await picker.loadFromUrl(resolveUrl(trimmed), { allowHttp, maxBytes });
    } finally {
      loading = false;
    }
  }
</script>

<div>
  <label>
    Image URL
    <input type="url" bind:value={url} placeholder="https://example.com/image.png" />
  </label>
  <button type="button" onclick={() => void handleLoad()} disabled={loading || url.trim() === ''}>
    Load from URL
  </button>
  {#if picker.state.error}
    <p role="alert">{picker.state.error.message}</p>
  {/if}
</div>
