<script lang="ts">
  import { onMount } from 'svelte';

  import { createMediaPicker } from '@modularcore/media-picker/svelte';
  import BulkActionsBar from '@modularcore/media-picker/ui/svelte/BulkActionsBar.svelte';
  import FolderSelect from '@modularcore/media-picker/ui/svelte/FolderSelect.svelte';
  import ImageEditor from '@modularcore/media-picker/ui/svelte/ImageEditor.svelte';
  import MediaLibraryGrid from '@modularcore/media-picker/ui/svelte/MediaLibraryGrid.svelte';
  import MimeTypeFilter from '@modularcore/media-picker/ui/svelte/MimeTypeFilter.svelte';
  import RemoteUrlLoader from '@modularcore/media-picker/ui/svelte/RemoteUrlLoader.svelte';

  import { createDemoStorageProvider } from '$lib/demo-storage-provider';

  // `multiple: true` turns library clicks into a togglable selection (BulkActionsBar shows up
  // once something is picked); the demo provider never touches real credentials — see
  // apps/web/src/lib/demo-storage-provider.ts.
  const picker = createMediaPicker(undefined, { multiple: true, maxSelection: 4 });
  const demoProvider = createDemoStorageProvider();

  let scope = $state<'mine' | 'all'>('mine');
  let folder = $state('');
  let mimeTypes = $state<string[]>([]);

  function refreshLibrary(): void {
    void picker.listLibrary(demoProvider, {
      scope,
      folder: folder || undefined,
      mimeTypes: mimeTypes.length > 0 ? mimeTypes : undefined,
    });
  }

  onMount(() => {
    void picker.listFolders(demoProvider);
    refreshLibrary();
  });

  function handleFileChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) picker.loadLocalFile(file);
    input.value = '';
  }

  async function handleUpload(): Promise<void> {
    await picker.upload(demoProvider, { key: folder ? `${folder}/upload` : undefined });
    refreshLibrary();
  }
</script>

<a href="/">&larr; Volver al catálogo</a>

<h1>Playground: Media Picker</h1>
<p>
  Demo en vivo de <code>@modularcore/media-picker</code> con un <strong>provider de demo</strong>
  en memoria (<code>createDemoStorageProvider</code>): los blobs nunca salen del navegador y no se
  usa ninguna credencial real. En una app real, sustituirías este provider por
  <code>providers/s3-compatible</code> o <code>providers/cloudinary</code>, respaldados por tu
  propio backend de firma.
</p>

<h2>1. Cargar una imagen</h2>
<p>Tres fuentes: archivo local, URL remota (con guard SSRF real), o desde la biblioteca abajo.</p>
<input type="file" accept="image/*" onchange={handleFileChange} />
<!--
  `fromRemoteUrl` (the core action `resolveUrl` feeds) does `new URL(url)` with no base, so a
  relative path throws "Invalid URL" — the proxy URL must be absolute. `allowHttp` is safe here
  specifically because the client-side SSRF guard is only ever validating OUR OWN same-origin
  proxy endpoint (protocol-only in the browser; see core/net/ssrf-guard.ts), never the actual
  attacker-controlled target — that real validation happens server-side inside the proxy
  handler regardless of what protocol reaches it.
-->
<RemoteUrlLoader
  {picker}
  allowHttp
  resolveUrl={(url) =>
    `${window.location.origin}/api/media/fetch-url?url=${encodeURIComponent(url)}`}
/>
<p>
  <small>
    La carga por URL pasa por un proxy server-side (<code>/api/media/fetch-url</code>) — un
    <code>fetch()</code> directo desde el navegador a un dominio de terceros casi siempre falla
    por CORS, ya que la mayoría de los hosts de imágenes no envían
    <code>Access-Control-Allow-Origin</code>.
  </small>
</p>

<h2>2. Editar (crop / rotate / flip / zoom)</h2>
{#if picker.state.blob}
  <ImageEditor {picker} />
{:else}
  <p><em>Cargá una imagen arriba para editarla.</em></p>
{/if}

<h2>3. Subir</h2>
<p>Estado: {picker.state.status}</p>
{#if picker.state.error}
  <p class="error">{picker.state.error.message}</p>
{/if}
{#if picker.state.blob}
  <button type="button" onclick={handleUpload} disabled={picker.state.status === 'uploading'}>
    Subir (demo)
  </button>
{/if}
{#if picker.state.result}
  <div class="result">
    <p>Subido: <code>{picker.state.result.key}</code></p>
    <img src={picker.state.result.url} alt="Media picker demo upload result" />
  </div>
{/if}

<h2>4. Biblioteca</h2>
<div class="library-controls">
  <label>
    Scope (UX-only — el filtrado real lo hace tu backend)
    <select
      bind:value={scope}
      onchange={refreshLibrary}
    >
      <option value="mine">Mine</option>
      <option value="all">All (admin)</option>
    </select>
  </label>
  <FolderSelect
    {picker}
    provider={demoProvider}
    value={folder}
    onChange={(id) => {
      folder = id;
      refreshLibrary();
    }}
  />
  <MimeTypeFilter
    options={['image/png', 'image/jpeg', 'image/webp']}
    selected={mimeTypes}
    onChange={(next) => {
      mimeTypes = next;
      refreshLibrary();
    }}
  />
  <button type="button" onclick={refreshLibrary}>Refrescar</button>
</div>
<MediaLibraryGrid {picker} />
<BulkActionsBar
  {picker}
  multiple
  onConfirm={(items) => {
    // In a real app: hand `items` (up to maxSelection=4 here) back to the consumer's form.
    console.log('Selección confirmada', items);
  }}
/>

<style>
  .error {
    color: #b00020;
  }
  .result img {
    max-width: 320px;
    display: block;
    margin-top: 0.5rem;
    border-radius: 6px;
  }
  .library-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-end;
    margin-bottom: 0.5rem;
  }
</style>
