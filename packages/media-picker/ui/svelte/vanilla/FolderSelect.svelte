<script lang="ts">
  import '../../vanilla-styles.css';
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

<div class="mc-field">
  <select {value} disabled={picker.state.foldersLoading} onchange={(event) => onChange(event.currentTarget.value)} class="mc-select">
    <option value="">All folders</option>
    {#each picker.state.folders as folder (folder.id)}
      <option value={folder.id}>{folder.name}</option>
    {/each}
  </select>
  {#if picker.state.foldersError}
    <p role="alert" class="mc-alert">{picker.state.foldersError.message}</p>
  {/if}
  {#if canCreate}
    <span>
      <input type="text" bind:value={newFolderName} placeholder="New folder" class="mc-input" />
      <button type="button" onclick={handleCreate} class="mc-button">Create</button>
    </span>
  {/if}
</div>
