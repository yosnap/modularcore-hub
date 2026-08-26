<script lang="ts">
  import { Toggle } from 'bits-ui';

  import '../../shadcn-theme.css';
  import { formatBytes } from '../../../core/format.js';
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

  function basename(key: string): string {
    return key.split('/').pop() || key;
  }
</script>

<!--
  Shadcn variant: same props/behavior as the headless MediaLibraryGrid. Each grid item is a
  real `bits-ui` Toggle (not just a styled <button>) — the same primitive shadcn-svelte itself
  uses. Requires `bits-ui` as a peer dependency + shadcn-theme.css + Tailwind loaded.
-->
<div role="grid" aria-busy={picker.state.libraryLoading} class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
  {#if picker.state.libraryError}
    <p role="alert" class="col-span-full text-sm text-destructive">{picker.state.libraryError.message}</p>
  {/if}
  {#each picker.state.libraryItems as item (item.key)}
    <Toggle.Root
      data-selected={isSelected(item)}
      pressed={isSelected(item)}
      onPressedChange={() => handleClick(item)}
      class="rounded-md border p-1 text-left transition-colors {isSelected(item) ? 'border-2 border-ring' : 'border-input hover:border-ring/50'}"
    >
      {#if item.mimeType?.startsWith('image/')}
        <img src={item.url} alt={item.key} class="aspect-square w-full rounded-sm object-cover" />
      {:else}
        <span class="block truncate text-xs text-muted-foreground">{item.key}</span>
      {/if}
      <div class="mt-1 leading-tight">
        <span class="block truncate text-xs text-foreground" title={item.key}>{basename(item.key)}</span>
        <span class="block text-[11px] text-muted-foreground">{formatBytes(item.size)}</span>
      </div>
    </Toggle.Root>
  {/each}
</div>
