<script lang="ts">
  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../../core/media-picker.js';

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
  <div role="toolbar" aria-label="Bulk actions" class="flex items-center gap-3 rounded-md border border-zinc-200 px-3 py-2">
    <span class="text-sm text-zinc-600">{picker.state.selection.length} selected</span>
    <button type="button" onclick={handleConfirm} class="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700">
      Confirm
    </button>
    <button type="button" onclick={() => picker.clearSelection()} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
      Clear
    </button>
  </div>
{/if}
