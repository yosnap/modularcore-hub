<script lang="ts">
  import '../../vanilla-styles.css';
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

<div class="mc-field">
  <label>
    Image URL
    <input type="url" bind:value={url} placeholder="https://example.com/image.png" class="mc-input" />
  </label>
  <button type="button" onclick={() => void handleLoad()} disabled={loading || url.trim() === ''} class="mc-button">
    Load from URL
  </button>
  {#if picker.state.error}
    <p role="alert" class="mc-alert">{picker.state.error.message}</p>
  {/if}
</div>
