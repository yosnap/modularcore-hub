<script lang="ts">
  import { createMediaPicker } from '@modularcore/media-picker/svelte';
  import ModernSelect from '$lib/components/ModernSelect.svelte';

  import type { LibraryItem } from '@modularcore/media-picker';

  // NOTE: these 4 style variants per component (headless + tailwind + shadcn + vanilla) are kept
  // imported even though only MediaLibraryModal/ImageEditor are rendered by this playground's
  // flow below — MediaLibraryModal/ImageEditor internally compose their own variant's
  // BulkActionsBar/FolderSelect/MediaLibraryGrid/MimeTypeFilter/RemoteUrlLoader, so those aren't
  // wired standalone here anymore (superseded by the modal redesign), but the imports are kept
  // resolvable to guard against silently breaking one variant's compile while editing this file.
  import BulkActionsBarHeadless from '@modularcore/media-picker/ui/svelte/BulkActionsBar.svelte';
  import FolderSelectHeadless from '@modularcore/media-picker/ui/svelte/FolderSelect.svelte';
  import ImageEditorHeadless from '@modularcore/media-picker/ui/svelte/ImageEditor.svelte';
  import MediaLibraryGridHeadless from '@modularcore/media-picker/ui/svelte/MediaLibraryGrid.svelte';
  import MediaLibraryModalHeadless from '@modularcore/media-picker/ui/svelte/MediaLibraryModal.svelte';
  import MimeTypeFilterHeadless from '@modularcore/media-picker/ui/svelte/MimeTypeFilter.svelte';
  import RemoteUrlLoaderHeadless from '@modularcore/media-picker/ui/svelte/RemoteUrlLoader.svelte';

  import BulkActionsBarTailwind from '@modularcore/media-picker/ui/svelte/tailwind/BulkActionsBar.svelte';
  import FolderSelectTailwind from '@modularcore/media-picker/ui/svelte/tailwind/FolderSelect.svelte';
  import ImageEditorTailwind from '@modularcore/media-picker/ui/svelte/tailwind/ImageEditor.svelte';
  import MediaLibraryGridTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MediaLibraryGrid.svelte';
  import MediaLibraryModalTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MediaLibraryModal.svelte';
  import MimeTypeFilterTailwind from '@modularcore/media-picker/ui/svelte/tailwind/MimeTypeFilter.svelte';
  import RemoteUrlLoaderTailwind from '@modularcore/media-picker/ui/svelte/tailwind/RemoteUrlLoader.svelte';

  import BulkActionsBarShadcn from '@modularcore/media-picker/ui/svelte/shadcn/BulkActionsBar.svelte';
  import FolderSelectShadcn from '@modularcore/media-picker/ui/svelte/shadcn/FolderSelect.svelte';
  import ImageEditorShadcn from '@modularcore/media-picker/ui/svelte/shadcn/ImageEditor.svelte';
  import MediaLibraryGridShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MediaLibraryGrid.svelte';
  import MediaLibraryModalShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MediaLibraryModal.svelte';
  import MimeTypeFilterShadcn from '@modularcore/media-picker/ui/svelte/shadcn/MimeTypeFilter.svelte';
  import RemoteUrlLoaderShadcn from '@modularcore/media-picker/ui/svelte/shadcn/RemoteUrlLoader.svelte';

  import BulkActionsBarVanilla from '@modularcore/media-picker/ui/svelte/vanilla/BulkActionsBar.svelte';
  import FolderSelectVanilla from '@modularcore/media-picker/ui/svelte/vanilla/FolderSelect.svelte';
  import ImageEditorVanilla from '@modularcore/media-picker/ui/svelte/vanilla/ImageEditor.svelte';
  import MediaLibraryGridVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MediaLibraryGrid.svelte';
  import MediaLibraryModalVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MediaLibraryModal.svelte';
  import MimeTypeFilterVanilla from '@modularcore/media-picker/ui/svelte/vanilla/MimeTypeFilter.svelte';
  import RemoteUrlLoaderVanilla from '@modularcore/media-picker/ui/svelte/vanilla/RemoteUrlLoader.svelte';

  import { createDemoStorageProvider } from '$lib/demo-storage-provider';

  // `multiple: true, maxSelection: 4` only takes effect for the "Selección múltiple (demo)"
  // trigger below — `MediaLibraryModal`'s own `multiple` prop controls whether the grid falls
  // back to this core-level accumulating selection (bulk demo) or calls `onSelectSingle` directly
  // (single-select "load into editor" path), so this config is inert for the latter. The demo
  // provider never touches real credentials — see apps/web/src/lib/demo-storage-provider.ts.
  const picker = createMediaPicker(undefined, { multiple: true, maxSelection: 4 });
  const demoProvider = createDemoStorageProvider();

  type StyleVariant = 'headless' | 'tailwind' | 'shadcn' | 'vanilla';
  // Default: 'shadcn' (see plan.md → Validation Log, Sesión 1) — the playground opens already
  // showing the Shadcn theme rather than the unstyled headless mode.
  let styleVariant = $state<StyleVariant>('shadcn');

  // Switching `styleVariant` swaps which component implementation renders — `picker` itself is
  // untouched, so state (loaded image, selection, folders, current library page) survives the
  // switch, including while a modal is open.
  const ActiveMediaLibraryModal = $derived(
    {
      headless: MediaLibraryModalHeadless,
      tailwind: MediaLibraryModalTailwind,
      shadcn: MediaLibraryModalShadcn,
      vanilla: MediaLibraryModalVanilla,
    }[styleVariant],
  );
  const ActiveImageEditor = $derived(
    { headless: ImageEditorHeadless, tailwind: ImageEditorTailwind, shadcn: ImageEditorShadcn, vanilla: ImageEditorVanilla }[
      styleVariant
    ],
  );

  // --- Library modal: two triggers share the same MediaLibraryModal, distinguished only by
  // `multiple` — a single-item click in the Biblioteca tab fires `onConfirm` (not `onLoaded`;
  // `onLoaded` only fires from the Subir archivo/Desde URL tabs, which already call
  // `loadLocalFile`/`loadFromUrl` internally) and hands off to the editor, while the multi-select
  // demo (`multiple=true`) keeps using `onConfirm` for the existing BulkActionsBar path. ---------
  let libraryModalOpen = $state(false);
  let bulkMode = $state(false);

  let editorModalOpen = $state(false);
  let editorSourceKey = $state<string | undefined>(undefined);
  let editorFileName = $state('');

  function openLibrary(bulk: boolean): void {
    bulkMode = bulk;
    libraryModalOpen = true;
  }

  function closeLibrary(): void {
    libraryModalOpen = false;
  }

  async function handleConfirm(items: LibraryItem[]): Promise<void> {
    if (bulkMode) {
      // In a real app: hand `items` (up to maxSelection=4) back to the consumer's form.
      console.log('Selección múltiple confirmada', items);
      closeLibrary();
      return;
    }

    // Single-select "load an existing library item into the editor" path. The Biblioteca tab
    // never populates `picker.state.blob` on its own for a plain selection — only `loadLocalFile`
    // (Subir archivo) and `loadFromUrl` (Desde URL) do that internally before firing `onLoaded`.
    // So we load the blob explicitly here via `loadFromLibrary` before opening the editor,
    // passing the item's real key as `sourceKey` so "Sobreescribir" targets the right object.
    const [item] = items;
    if (!item) return;
    closeLibrary();
    await picker.loadFromLibrary(demoProvider, item.key);
    editorSourceKey = item.key;
    editorFileName = item.key;
    editorModalOpen = true;
  }

  function handleLoaded(blob: Blob): void {
    // Fresh upload or URL load — no pre-existing key, so `sourceKey` stays undefined and
    // ImageEditor's "Sobreescribir" button stays disabled per Phase 3's contract (never guess a
    // key from an editable field).
    editorSourceKey = undefined;
    editorFileName = blob instanceof File ? blob.name : '';
    editorModalOpen = true;
  }

  function closeEditor(): void {
    editorModalOpen = false;
    editorSourceKey = undefined;
    editorFileName = '';
  }

  function handleEditorSaved(): void {
    closeEditor();
  }
</script>

<h1>Playground: Media Picker</h1>
<p>
  Demo en vivo de <code>@modularcore/media-picker</code> con un <strong>provider de demo</strong>
  en memoria (<code>createDemoStorageProvider</code>): los blobs nunca salen del navegador y no se
  usa ninguna credencial real. En una app real, sustituirías este provider por
  <code>providers/s3-compatible</code> o <code>providers/cloudinary</code>, respaldados por tu
  propio backend de firma.
</p>
<p>
  Flujo: abrí la <strong>biblioteca de medios</strong> (pestañas Biblioteca / Subir archivo / Desde
  URL) para elegir o cargar una imagen; al elegirla se abre el <strong>editor de imagen</strong>
  (recorte, rotar, flip, zoom + panel de metadatos UI-only) con un pie Cancelar / Sobreescribir /
  Guardar como nuevo. "Sobreescribir" solo se habilita cuando la imagen viene de un elemento
  existente de la biblioteca.
</p>

<div class="style-switcher">
  <label>
    Estilo del componente
    <ModernSelect
      bind:value={styleVariant}
      ariaLabel="Estilo del componente"
      options={[
        { value: 'headless', label: 'Sin estilo (headless)' },
        { value: 'tailwind', label: 'Tailwind' },
        { value: 'shadcn', label: 'Shadcn' },
        { value: 'vanilla', label: 'CSS plano' },
      ]}
    />
  </label>
  <small>
    La descarga del componente (<code>modularcore add media-picker</code> o el tarball del
    catálogo) incluye las 3 variantes con estilo + la headless — este selector solo cambia el
    preview en vivo. Usá los imports de <code>ui/{'{'}react,svelte{'}'}/{'{'}tailwind,shadcn,vanilla{'}'}</code>
    según cuál prefieras en tu proyecto.
  </small>
</div>

<div class="triggers">
  <button type="button" class="btn btn-primary" onclick={() => openLibrary(false)}>
    Abrir biblioteca de medios
  </button>
  <button type="button" class="btn btn-secondary" onclick={() => openLibrary(true)}>
    Selección múltiple (demo)
  </button>
</div>

<!--
  Debug strip: keeps `picker.state` inspectable outside the modals (Risk Assessment mitigation —
  collapsing the old always-visible sections into modals must not hide state from a reviewer who
  isn't currently interacting with either modal).
-->
<div class="debug-strip">
  <p>Estado: <code>{picker.state.status}</code></p>
  {#if picker.state.error}
    <p class="error">{picker.state.error.message}</p>
  {/if}
  {#if picker.state.result}
    <p>
      Última subida: <code>{picker.state.result.key}</code>
    </p>
  {/if}
</div>

<ActiveMediaLibraryModal
  {picker}
  provider={demoProvider}
  open={libraryModalOpen}
  onClose={closeLibrary}
  onConfirm={handleConfirm}
  onLoaded={handleLoaded}
  allowHttp
  resolveUrl={(url) =>
    `${window.location.origin}/api/media/fetch-url?url=${encodeURIComponent(url)}`}
  multiple={bulkMode}
/>

<ActiveImageEditor
  {picker}
  provider={demoProvider}
  open={editorModalOpen}
  onClose={closeEditor}
  sourceKey={editorSourceKey}
  fileName={editorFileName}
  onCancel={closeEditor}
  onOverwrite={handleEditorSaved}
  onSaveAsNew={handleEditorSaved}
/>

<style>
  .error {
    color: var(--mc-danger);
  }
  .triggers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  /* Explicit, theme-aware button styles (independent of Tailwind utility generation). */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 1rem;
    border-radius: 0.6rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background-color 0.16s var(--ui-ease-out),
      border-color 0.16s var(--ui-ease-out),
      transform 0.16s var(--ui-ease-out);
  }
  .btn:hover {
    transform: translateY(-1px);
  }
  .btn:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
  .btn-primary {
    border-color: transparent;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }
  .btn-primary:hover {
    background: hsl(var(--primary) / 0.9);
  }
  .btn-secondary {
    border-color: hsl(var(--border));
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }
  .btn-secondary:hover {
    background: hsl(var(--muted));
  }
  /* Compact status chip that hugs its content instead of an empty full-width dashed box. */
  .debug-strip {
    display: inline-flex;
    flex-direction: column;
    gap: 0.25rem;
    align-self: flex-start;
    max-width: 100%;
    padding: 0.5rem 0.85rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: var(--ui-glass-bg);
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }
  .style-switcher {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.9rem 1.1rem;
    border: 1px solid var(--ui-glass-border);
    border-radius: var(--ui-radius-xl);
    background: var(--ui-glass-bg);
    margin-bottom: 1rem;
    font-weight: 600;
  }
</style>
