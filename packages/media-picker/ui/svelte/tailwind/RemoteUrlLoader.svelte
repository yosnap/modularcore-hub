<script lang="ts">
  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';

  let {
    picker,
    allowHttp,
    maxBytes,
    resolveUrl = (value: string) => value,
  }: {
    picker: MediaPickerRune;
    allowHttp?: boolean;
    maxBytes?: number;
    /** See the headless RemoteUrlLoader for why this must resolve to an absolute, same-origin
     * proxy URL (browser CORS + SSRF guard rationale) — that contract is unchanged here. */
    resolveUrl?: (url: string) => string;
  } = $props();

  let url = $state('');
  let loading = $state(false);

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

<div class="flex flex-wrap items-end gap-2">
  <label class="flex flex-1 min-w-56 flex-col gap-1 text-sm text-zinc-700">
    URL de la imagen
    <span class="relative">
      <svg
        aria-hidden="true"
        class="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.5-1.5" />
      </svg>
      <input
        type="url"
        bind:value={url}
        placeholder="https://example.com/image.png"
        class="w-full rounded-md border border-zinc-300 py-1.5 pl-7 pr-2 text-sm"
      />
    </span>
  </label>
  <button
    type="button"
    onclick={() => void handleLoad()}
    disabled={loading || !valid}
    class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
  >
    Usar esta URL
  </button>
  {#if picker.state.error}
    <p role="alert" class="w-full text-sm text-red-600">{picker.state.error.message}</p>
  {/if}
</div>
