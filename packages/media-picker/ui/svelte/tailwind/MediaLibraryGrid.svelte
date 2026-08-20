<script lang="ts">
  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../../core/media-picker.js';

  let {
    picker,
    onSelectSingle,
  }: {
    picker: MediaPickerRune;
    onSelectSingle?: (item: LibraryItem) => void;
  } = $props();

  function handleClick(item: LibraryItem): void {
    if (onSelectSingle) {
      onSelectSingle(item);
      return;
    }
    picker.toggleLibrarySelection(item);
  }

  function isSelected(item: LibraryItem): boolean {
    return picker.state.selection.some((selected) => selected.key === item.key);
  }
</script>

<!-- Tailwind variant: same props/behavior as the headless MediaLibraryGrid. -->
<div role="grid" aria-busy={picker.state.libraryLoading} class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
  {#if picker.state.libraryError}
    <p role="alert" class="col-span-full text-sm text-red-600">{picker.state.libraryError.message}</p>
  {/if}
  {#each picker.state.libraryItems as item (item.key)}
    <button
      type="button"
      aria-pressed={isSelected(item)}
      data-selected={isSelected(item)}
      onclick={() => handleClick(item)}
      class="rounded-md border p-1 text-left transition-colors {isSelected(item) ? 'border-2 border-zinc-900' : 'border-zinc-200 hover:border-zinc-400'}"
    >
      {#if item.mimeType?.startsWith('image/')}
        <img src={item.url} alt={item.key} class="aspect-square w-full rounded object-cover" />
      {:else}
        <span class="block truncate text-xs text-zinc-600">{item.key}</span>
      {/if}
    </button>
  {/each}
</div>
