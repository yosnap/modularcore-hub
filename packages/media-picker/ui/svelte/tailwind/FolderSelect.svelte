<script lang="ts">
  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { StorageProvider } from '../../../core/provider.js';

  let {
    picker,
    provider,
    value = '',
    onChange,
  }: {
    picker: MediaPickerRune;
    provider: StorageProvider;
    value?: string;
    onChange: (folderId: string) => void;
  } = $props();

  let newFolderName = $state('');
  const canCreate = typeof provider.createFolder === 'function';

  async function handleCreate(): Promise<void> {
    const name = newFolderName.trim();
    if (!name) return;
    const folder = await picker.createFolder(provider, name);
    newFolderName = '';
    onChange(folder.id);
  }
</script>

<div class="flex flex-wrap items-center gap-2">
  <select
    {value}
    disabled={picker.state.foldersLoading}
    onchange={(event) => onChange(event.currentTarget.value)}
    class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
  >
    <option value="">All folders</option>
    {#each picker.state.folders as folder (folder.id)}
      <option value={folder.id}>{folder.name}</option>
    {/each}
  </select>
  {#if picker.state.foldersError}
    <p role="alert" class="text-sm text-red-600">{picker.state.foldersError.message}</p>
  {/if}
  {#if canCreate}
    <span class="flex items-center gap-2">
      <input
        type="text"
        bind:value={newFolderName}
        placeholder="New folder"
        class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onclick={handleCreate}
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
      >
        Create
      </button>
    </span>
  {/if}
</div>
