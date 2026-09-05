<script lang="ts">
  import '../../vanilla-styles.css';
  import { basename, formatBytes, formatVariantBadge, sortVariants } from '../../../core/format.js';
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

<!-- Vanilla CSS variant: same props/behavior as the headless MediaLibraryGrid. -->
<div role="grid" aria-busy={picker.state.libraryLoading} class="mc-grid">
  {#if picker.state.libraryError}
    <p role="alert" class="mc-alert">{picker.state.libraryError.message}</p>
  {/if}
  {#each picker.state.libraryItems as item (item.key)}
    <button
      type="button"
      aria-pressed={isSelected(item)}
      data-selected={isSelected(item)}
      onclick={() => handleClick(item)}
      class="mc-grid__item"
      class:mc-grid__item--selected={isSelected(item)}
    >
      {#if item.mimeType?.startsWith('image/')}
        <img src={item.url} alt={item.key} class="mc-grid__thumb" />
      {:else}
        <span>{item.key}</span>
      {/if}
      <div class="mc-grid__caption">
        <span class="mc-grid__filename" title={item.key}>{basename(item.key)}</span>
        <span class="mc-grid__size">{formatBytes(item.size)}</span>
        {#if item.variants?.length}
          <span class="mc-grid__variants">
            {#each sortVariants(item.variants) as variant (variant.key)}
              <span class="mc-grid__variant" title={variant.label}
                >{formatVariantBadge(variant)}</span
              >
            {/each}
          </span>
        {/if}
      </div>
    </button>
  {/each}
</div>
