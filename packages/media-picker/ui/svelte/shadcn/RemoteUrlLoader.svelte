<script lang="ts">
  import '../../shadcn-theme.css';
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

<div class="flex flex-wrap items-end gap-2">
  <label class="flex flex-col gap-1 text-sm text-foreground">
    Image URL
    <input type="url" bind:value={url} placeholder="https://example.com/image.png" class="min-w-64 rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  </label>
  <button
    type="button"
    onclick={() => void handleLoad()}
    disabled={loading || url.trim() === ''}
    class="rounded-md border border-input bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-accent disabled:opacity-50"
  >
    Load from URL
  </button>
  {#if picker.state.error}
    <p role="alert" class="w-full text-sm text-destructive">{picker.state.error.message}</p>
  {/if}
</div>
