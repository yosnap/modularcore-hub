<script lang="ts">
  import { onMount } from 'svelte';

  import { createMediaPicker } from '@modularcore/media-picker/svelte';

  import BulkActionsBarHeadless from '@modularcore/media-picker/ui/svelte/BulkActionsBar.svelte';
  import FolderSelectHeadless from '@modularcore/media-picker/ui/svelte/FolderSelect.svelte';
  import ImageEditorHeadless from '@modularcore/media-picker/ui/svelte/ImageEditor.svelte';
  import MediaLibraryGridHeadless from '@modularcore/media-picker/ui/svelte/MediaLibraryGrid.svelte';
  import MimeTypeFilterHeadless from '@modularcore/media-picker/ui/svelte/MimeTypeFilter.svelte';
  import RemoteUrlLoaderHeadless from '@modularcore/media-picker/ui/svelte/RemoteUrlLoader.svelte';

  import BulkActionsBarTailwind from '@modularcore/media-picker/ui/svelte/tailwind/BulkActionsBar.svelte';
  import FolderSelectTailwind from '@modularcore/media-picker/ui/svelte/tailwind/FolderSelect.svelte';
  import ImageEditorTailwind from '@modularcore/media-picker/ui/svelte/tailwind/ImageEditor.svelte';
  import MediaLibraryGridTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MediaLibraryGrid.svelte';
  import MimeTypeFilterTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MimeTypeFilter.svelte';
  import RemoteUrlLoaderTailwind from '@modularcore/media-picker/ui/svelte/tailwind/RemoteUrlLoader.svelte';

  import BulkActionsBarShadcn from '@modularcore/media-picker/ui/svelte/shadcn/BulkActionsBar.svelte';
  import FolderSelectShadcn from '@modularcore/media-picker/ui/svelte/shadcn/FolderSelect.svelte';
  import ImageEditorShadcn from '@modularcore/media-picker/ui/svelte/shadcn/ImageEditor.svelte';
  import MediaLibraryGridShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MediaLibraryGrid.svelte';
  import MimeTypeFilterShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MimeTypeFilter.svelte';
  import RemoteUrlLoaderShadcn from '@modularcore/media-picker/ui/svelte/shadcn/RemoteUrlLoader.svelte';

  import BulkActionsBarVanilla from '@modularcore/media-picker/ui/svelte/vanilla/BulkActionsBar.svelte';
  import FolderSelectVanilla from '@modularcore/media-picker/ui/svelte/vanilla/FolderSelect.svelte';
  import ImageEditorVanilla from '@modularcore/media-picker/ui/svelte/vanilla/ImageEditor.svelte';
  import MediaLibraryGridVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MediaLibraryGrid.svelte';
  import MimeTypeFilterVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MimeTypeFilter.svelte';
  import RemoteUrlLoaderVanilla from '@modularcore/media-picker/ui/svelte/vanilla/RemoteUrlLoader.svelte';

  import { createDemoStorageProvider } from '$lib/demo-storage-provider';

  // `multiple: true` turns library clicks into a togglable selection (BulkActionsBar shows up
  // once something is picked); the demo provider never touches real credentials — see
  // apps/web/src/lib/demo-storage-provider.ts.
  const picker = createMediaPicker(undefined, { multiple: true, maxSelection: 4 });
  const demoProvider = createDemoStorageProvider();

  let scope = $state<'mine' | 'all'>('mine');
  let folder = $state('');
  let mimeTypes = $state<string[]>([]);

  type StyleVariant = 'headless' | 'tailwind' | 'shadcn' | 'vanilla';
  // Default: 'shadcn' (see plan.md → Validation Log, Sesión 1) — the playground opens already
  // showing the Shadcn theme rather than the unstyled headless mode.
  let styleVariant = $state<StyleVariant>('shadcn');

  // Switching `styleVariant` swaps which component implementation renders — `picker` itself is
  // untouched, so state (loaded image, selection, folders) survives the switch.
  const ActiveBulkActionsBar = $derived(
    { headless: BulkActionsBarHeadless, tailwind: BulkActionsBarTailwind, shadcn: BulkActionsBarShadcn, vanilla: BulkActionsBarVanilla }[
      styleVariant
    ],
  );
  const ActiveFolderSelect = $derived(
    { headless: FolderSelectHeadless, tailwind: FolderSelectTailwind, shadcn: FolderSelectShadcn, vanilla: FolderSelectVanilla }[
      styleVariant
    ],
  );
  const ActiveImageEditor = $derived(
    { headless: ImageEditorHeadless, tailwind: ImageEditorTailwind, shadcn: ImageEditorShadcn, vanilla: ImageEditorVanilla }[
      styleVariant
    ],
  );
  const ActiveMediaLibraryGrid = $derived(
    {
      headless: MediaLibraryGridHeadless,
      tailwind: MediaLibraryGridTailwind,
      shadcn: MediaLibraryGridShadcn,
      vanilla: MediaLibraryGridVanilla,
    }[styleVariant],
  );
  const ActiveMimeTypeFilter = $derived(
    { headless: MimeTypeFilterHeadless, tailwind: MimeTypeFilterTailwind, shadcn: MimeTypeFilterShadcn, vanilla: MimeTypeFilterVanilla }[
      styleVariant
    ],
  );
  const ActiveRemoteUrlLoader = $derived(
    {
      headless: RemoteUrlLoaderHeadless,
      tailwind: RemoteUrlLoaderTailwind,
      shadcn: RemoteUrlLoaderShadcn,
      vanilla: RemoteUrlLoaderVanilla,
    }[styleVariant],
  );

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

<div class="style-switcher">
  <label>
    Estilo del componente
    <select
      bind:value={styleVariant}
      class="rounded-md border border-input bg-background px-2 py-1 text-sm"
    >
      <option value="headless">Sin estilo (headless)</option>
      <option value="tailwind">Tailwind</option>
      <option value="shadcn">Shadcn</option>
      <option value="vanilla">CSS plano</option>
    </select>
  </label>
  <small>
    La descarga del componente (<code>modularcore add media-picker</code> o el tarball del
    catálogo) incluye las 3 variantes con estilo + la headless — este selector solo cambia el
    preview en vivo. Usá los imports de <code>ui/{'{'}react,svelte{'}'}/{'{'}tailwind,shadcn,vanilla{'}'}</code>
    según cuál prefieras en tu proyecto.
  </small>
</div>

<h2>1. Cargar una imagen</h2>
<p>Tres fuentes: archivo local, URL remota (con guard SSRF real), o desde la biblioteca abajo.</p>
<input
  type="file"
  accept="image/*"
  onchange={handleFileChange}
  class="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
/>
<!--
  `fromRemoteUrl` (the core action `resolveUrl` feeds) does `new URL(url)` with no base, so a
  relative path throws "Invalid URL" — the proxy URL must be absolute. `allowHttp` is safe here
  specifically because the client-side SSRF guard is only ever validating OUR OWN same-origin
  proxy endpoint (protocol-only in the browser; see core/net/ssrf-guard.ts), never the actual
  attacker-controlled target — that real validation happens server-side inside the proxy
  handler regardless of what protocol reaches it.
-->
<ActiveRemoteUrlLoader
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
  <ActiveImageEditor {picker} />
{:else}
  <p><em>Cargá una imagen arriba para editarla.</em></p>
{/if}

<h2>3. Subir</h2>
<p>Estado: {picker.state.status}</p>
{#if picker.state.error}
  <p class="error">{picker.state.error.message}</p>
{/if}
{#if picker.state.blob}
  <button
    type="button"
    onclick={handleUpload}
    disabled={picker.state.status === 'uploading'}
    class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
  >
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
      class="rounded-md border border-input bg-background px-2 py-1 text-sm"
    >
      <option value="mine">Mine</option>
      <option value="all">All (admin)</option>
    </select>
  </label>
  <ActiveFolderSelect
    {picker}
    provider={demoProvider}
    value={folder}
    onChange={(id) => {
      folder = id;
      refreshLibrary();
    }}
  />
  <ActiveMimeTypeFilter
    options={['image/png', 'image/jpeg', 'image/webp']}
    selected={mimeTypes}
    onChange={(next) => {
      mimeTypes = next;
      refreshLibrary();
    }}
  />
  <button
    type="button"
    onclick={refreshLibrary}
    class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
  >
    Refrescar
  </button>
</div>
<ActiveMediaLibraryGrid {picker} />
<ActiveBulkActionsBar
  {picker}
  multiple
  onConfirm={(items) => {
    // In a real app: hand `items` (up to maxSelection=4 here) back to the consumer's form.
    console.log('Selección confirmada', items);
  }}
/>

<style>
  .error {
    color: var(--mc-danger);
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
  .style-switcher {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--mc-neutral-200);
    border-radius: 8px;
    margin-bottom: 1rem;
  }
</style>
