<script lang="ts">
  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../core/media-picker.js';

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

<!--
  Deliberately unstyled: a plain grid of buttons, no CSS framework, no design polish — this
  package ships headless-first with minimal reference UI. Restyle freely.
-->
<div role="grid" aria-busy={picker.state.libraryLoading} style="display:grid;grid-template-columns:repeat(auto-fill, minmax(96px, 1fr));gap:8px">
  {#if picker.state.libraryError}
    <p role="alert">{picker.state.libraryError.message}</p>
  {/if}
  {#each picker.state.libraryItems as item (item.key)}
    <button
      type="button"
      aria-pressed={isSelected(item)}
      data-selected={isSelected(item)}
      onclick={() => handleClick(item)}
      style="border:{isSelected(item) ? '2px solid #333' : '1px solid #ccc'};padding:4px"
    >
      {#if item.mimeType?.startsWith('image/')}
        <img src={item.url} alt={item.key} style="width:100%;height:auto" />
      {:else}
        <span>{item.key}</span>
      {/if}
    </button>
  {/each}
</div>
