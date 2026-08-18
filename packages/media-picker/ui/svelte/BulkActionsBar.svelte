<script lang="ts">
  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../core/media-picker.js';

  let {
    picker,
    multiple,
    onConfirm,
  }: {
    picker: MediaPickerRune;
    multiple: boolean;
    onConfirm?: (items: LibraryItem[]) => void;
  } = $props();

  function handleConfirm(): void {
    onConfirm?.(picker.confirmSelection());
  }
</script>

{#if multiple && picker.state.selection.length > 0}
  <div role="toolbar" aria-label="Bulk actions">
    <span>{picker.state.selection.length} selected</span>
    <button type="button" onclick={handleConfirm}>Confirm</button>
    <button type="button" onclick={() => picker.clearSelection()}>Clear</button>
  </div>
{/if}
