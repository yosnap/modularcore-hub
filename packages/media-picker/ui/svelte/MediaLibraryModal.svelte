<script lang="ts">
  import { onDestroy } from 'svelte';

  import BulkActionsBar from './BulkActionsBar.svelte';
  import MediaLibraryGrid from './MediaLibraryGrid.svelte';
  import RemoteUrlLoader from './RemoteUrlLoader.svelte';
  import ModernSelect from './ModernSelect.svelte';

  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../core/media-picker.js';
  import type { ListOptions, StorageProvider, UploadResult } from '../../core/provider.js';

  type ModalTab = 'library' | 'upload' | 'url';

  interface UploadQueueItem {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    result?: UploadResult;
    error?: Error;
  }

  const MAX_FILE_BYTES = 8 * 1024 * 1024;
  const MAX_FILES = 20;
  const PER_PAGE_OPTIONS = [12, 24, 48, 96];

  let {
    picker,
    provider,
    open,
    onClose,
    onConfirm,
    onLoaded,
    resolveUrl = (value: string) => value,
    allowHttp,
    multiple = false,
    folders = true,
  }: {
    picker: MediaPickerRune;
    provider: StorageProvider;
    open: boolean;
    onClose: () => void;
    onConfirm?: (items: LibraryItem[]) => void;
    /** Emitted when a single local file or a remote URL loads a blob ready for editing — Phase 5
     * chains this into the (Phase 3) ImageEditor modal. Multi-file uploads (see below) skip this
     * entirely since they upload directly, never populating `picker.state.blob`. */
    onLoaded?: (blob: Blob) => void;
    resolveUrl?: (url: string) => string;
    allowHttp?: boolean;
    multiple?: boolean;
    /** Show the folder pill-tabs row in the Biblioteca tab. Default `true`. */
    folders?: boolean;
  } = $props();

  let activeTab = $state<ModalTab>('library');
  let dialogEl: HTMLDivElement | undefined = $state();
  let initializedForOpen = $state(false);

  // --- Biblioteca tab: search / sort / per-page / folder / pagination -------------------------
  let searchInput = $state('');
  let sortValue = $state<ListOptions['sort']>(undefined);
  let perPage = $state(24);
  let folderId = $state('');
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  function clearSearchTimer(): void {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
  }
  onDestroy(clearSearchTimer);

  async function fetchPage(page: number): Promise<void> {
    await picker.listPage(provider, {
      page,
      folder: folderId || undefined,
      query: searchInput.trim() || undefined,
      sort: sortValue,
      limit: perPage,
    });
  }

  $effect(() => {
    if (open && !initializedForOpen) {
      initializedForOpen = true;
      // Baseline: a blob that already existed before this open (e.g. loaded elsewhere in the
      // host app) must not be mistaken for a fresh "Desde URL" load once the user switches to
      // that tab — only a blob that changes AFTER this point should trigger the hand-off below.
      lastHandledBlob = picker.state.blob;
      searchInput = picker.state.libraryQuery;
      sortValue = picker.state.librarySort;
      void fetchPage(picker.state.libraryPage.currentPage || 1);
      if (folders && picker.state.folders.length === 0 && !picker.state.foldersLoading) {
        void picker.listFolders(provider);
      }
    }
    if (!open) {
      initializedForOpen = false;
      clearSearchTimer();
    }
  });

  function handleSearchInput(value: string): void {
    searchInput = value;
    clearSearchTimer();
    searchTimer = setTimeout(() => {
      void fetchPage(1);
    }, 300);
  }

  function handleSortChange(value: string): void {
    sortValue = (value || undefined) as ListOptions['sort'];
    void fetchPage(1);
  }

  // `limit` is not part of `listPage()`'s filter-change key (see core/media-picker.ts), so a
  // per-page change alone would not reset the page cache — force page 1 explicitly instead of
  // relying on the core to detect it.
  function handlePerPageChange(value: number): void {
    perPage = value;
    void fetchPage(1);
  }

  function handleFolderChange(id: string): void {
    folderId = id;
    void fetchPage(1);
  }

  function handleSync(): void {
    void picker.syncLibrary(provider);
  }

  // Only pages the core has actually recorded a reachable cursor for — `knownPages` already
  // includes the "next page" lookahead as soon as the previous page's response resolves (see
  // `recordPageCursor` in core/library-state.ts), so this never renders a dead/unreachable button.
  const pageButtons = $derived(
    Array.from({ length: picker.state.libraryPage.knownPages }, (_, index) => index + 1),
  );

  function handlePageClick(page: number): void {
    if (page === picker.state.libraryPage.currentPage) return;
    void fetchPage(page);
  }

  function handleConfirmSelection(items: LibraryItem[]): void {
    onConfirm?.(items);
    onClose();
  }

  function handleSelectSingle(item: LibraryItem): void {
    onConfirm?.([item]);
    onClose();
  }

  // --- Subir archivo tab ------------------------------------------------------------------------
  let uploadQueue = $state<UploadQueueItem[]>([]);
  let uploadBannerError = $state<string | null>(null);
  let dragOver = $state(false);

  function validateFile(file: File): string | undefined {
    if (file.size > MAX_FILE_BYTES) return 'Supera 8MB';
    return undefined;
  }

  function findQueueItem(id: string): UploadQueueItem | undefined {
    return uploadQueue.find((entry) => entry.id === id);
  }

  function handleFiles(fileList: FileList | File[]): void {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    uploadBannerError = null;

    if (files.length === 1) {
      // Single-file "load then edit" path — feeds the shared picker.state.blob directly, does
      // NOT touch the upload queue below. See Requirements/Architecture: only the multi-file
      // path needs the local-queue bypass.
      const [file] = files;
      const validationError = validateFile(file);
      if (validationError) {
        uploadBannerError = `${file.name}: ${validationError}`;
        return;
      }
      picker.loadLocalFile(file);
      onLoaded?.(file);
      onClose();
      return;
    }

    enqueueFiles(files);
  }

  function enqueueFiles(files: File[]): void {
    const capacity = MAX_FILES - uploadQueue.length;
    if (capacity <= 0) {
      uploadBannerError = `Ya hay ${MAX_FILES} archivos en la cola — el máximo permitido.`;
      return;
    }
    const accepted = files.slice(0, capacity);
    if (files.length > accepted.length) {
      uploadBannerError = `Se agregaron ${accepted.length} de ${files.length} archivos — máximo ${MAX_FILES}.`;
    }

    const newItems: UploadQueueItem[] = accepted.map((file) => {
      const validationError = validateFile(file);
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        status: validationError ? 'error' : 'pending',
        progress: 0,
        error: validationError ? new Error(validationError) : undefined,
      };
    });

    uploadQueue = [...uploadQueue, ...newItems];
    const pendingIds = newItems.filter((item) => item.status === 'pending').map((item) => item.id);
    void processQueue(pendingIds);
  }

  /**
   * Uploads each queued file DIRECTLY via `provider.upload()` — never `picker.loadLocalFile`/
   * `picker.upload`. `MediaPicker`'s core state machine shares a single `state.blob`/`progress`/
   * `status` slot for one blob at a time (see `core/media-picker.ts`); looping the picker API
   * per dropped file would race N concurrent uploads against that one shared slot (Red Team
   * Finding 4, Critical). `picker.state` is only touched afterward, via `syncLibrary()` below,
   * which is a separate library-browsing state slice, not the blob pipeline.
   */
  async function processQueue(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await Promise.allSettled(ids.map((id) => uploadOne(id)));
    if (ids.some((id) => findQueueItem(id)?.status === 'done')) {
      void picker.syncLibrary(provider);
    }
  }

  async function uploadOne(id: string): Promise<void> {
    const file = findQueueItem(id)?.file;
    if (!file) return;
    const uploading = findQueueItem(id);
    if (uploading) uploading.status = 'uploading';
    try {
      const result = await provider.upload(file, {
        key: folderId ? `${folderId}/${file.name}` : undefined,
        contentType: file.type || undefined,
        onProgress: (loaded, total) => {
          const entry = findQueueItem(id);
          if (entry) entry.progress = total > 0 ? loaded / total : 0;
        },
      });
      const done = findQueueItem(id);
      if (done) {
        done.status = 'done';
        done.progress = 1;
        done.result = result;
      }
    } catch (error) {
      const errored = findQueueItem(id);
      if (errored) {
        errored.status = 'error';
        errored.error = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  function handleInputChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    if (input.files) handleFiles(input.files);
    input.value = '';
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragOver = false;
    if (event.dataTransfer?.files) handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave(): void {
    dragOver = false;
  }

  // --- Desde URL tab: hand off once loadFromUrl lands a fresh blob ------------------------------
  let lastHandledBlob: Blob | null = null;
  $effect(() => {
    const blob = picker.state.blob;
    if (activeTab === 'url' && blob && blob !== lastHandledBlob && !picker.state.error) {
      lastHandledBlob = blob;
      onLoaded?.(blob);
      onClose();
    }
  });

  // --- Modal shell: focus trap + Escape + backdrop click -----------------------------------------
  $effect(() => {
    if (open) dialogEl?.focus();
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogEl) return;
    const focusable = Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

</script>

<!--
  Deliberately unstyled: structure + ARIA only, no CSS framework — this package ships
  headless-first with minimal reference UI. Restyle freely.
-->
{#if open}
  <div role="presentation" onclick={onClose}>
    <div
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de medios"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <div>
        <h2>Biblioteca de medios</h2>
        <button type="button" onclick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <div role="tablist">
        <button type="button" role="tab" aria-selected={activeTab === 'library'} onclick={() => (activeTab = 'library')}>
          Biblioteca
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'upload'} onclick={() => (activeTab = 'upload')}>
          Subir archivo
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'url'} onclick={() => (activeTab = 'url')}>
          Desde URL
        </button>
      </div>

      {#if activeTab === 'library'}
        <div role="tabpanel">
          <div>
            <label>
              Buscar
              <input
                type="search"
                value={searchInput}
                oninput={(event) => handleSearchInput(event.currentTarget.value)}
                placeholder="Buscar por nombre…"
              />
            </label>
            <button type="button" onclick={handleSync} disabled={picker.state.libraryLoading} aria-busy={picker.state.libraryLoading}>
              {picker.state.libraryLoading ? 'Sincronizando…' : 'Sincronizar'}
            </button>
          </div>

          {#if folders}
            <div role="group" aria-label="Carpetas">
              <button type="button" aria-pressed={folderId === ''} onclick={() => handleFolderChange('')}>
                Todas
              </button>
              {#each picker.state.folders as folder (folder.id)}
                <button type="button" aria-pressed={folderId === folder.id} onclick={() => handleFolderChange(folder.id)}>
                  {folder.name}
                </button>
              {/each}
            </div>
          {/if}

          <MediaLibraryGrid {picker} onSelectSingle={multiple ? undefined : handleSelectSingle} />

          {#if multiple}
            <BulkActionsBar {picker} multiple onConfirm={handleConfirmSelection} />
          {/if}

          <div>
            <span>{picker.state.libraryItems.length} elementos</span>
            <label>
              Orden
              <ModernSelect value={sortValue ?? ''} onchange={handleSortChange} options={[{ value: '', label: 'Predeterminado' }, { value: 'newest', label: 'Más recientes' }, { value: 'oldest', label: 'Más antiguos' }, { value: 'name', label: 'Nombre' }, { value: 'size', label: 'Tamaño' }]} placeholder="Orden" />
            </label>
            <label>
              Por página
              <ModernSelect value={String(perPage)} onchange={(value) => handlePerPageChange(Number(value))} options={PER_PAGE_OPTIONS.map((option) => ({ value: String(option), label: String(option) }))} placeholder="Por página" />
            </label>
            <nav aria-label="Paginación">
              {#each pageButtons as page (page)}
                <button
                  type="button"
                  aria-current={page === picker.state.libraryPage.currentPage ? 'page' : undefined}
                  disabled={picker.state.libraryLoading}
                  onclick={() => handlePageClick(page)}
                >
                  {page}
                </button>
              {/each}
            </nav>
          </div>
        </div>
      {:else if activeTab === 'upload'}
        <div role="tabpanel">
          <div
            role="button"
            tabindex="0"
            aria-label="Elegí archivo(s) o arrastrá y soltá"
            ondrop={handleDrop}
            ondragover={handleDragOver}
            ondragleave={handleDragLeave}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                (event.currentTarget.querySelector('input[type="file"]') as HTMLInputElement | null)?.click();
              }
            }}
            data-dragover={dragOver}
          >
            <p>Elegí archivo(s) o arrastrá y soltá</p>
            <p>Imágenes de hasta 8MB, máx. 20</p>
            <input type="file" accept="image/*" multiple onchange={handleInputChange} />
          </div>

          {#if uploadBannerError}
            <p role="alert">{uploadBannerError}</p>
          {/if}

          {#if uploadQueue.length > 0}
            <ul>
              {#each uploadQueue as item (item.id)}
                <li>
                  <span>{item.file.name}</span>
                  <span>({Math.round(item.progress * 100)}%)</span>
                  <span>{item.status}</span>
                  {#if item.error}
                    <span role="alert">{item.error.message}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <div role="tabpanel">
          <RemoteUrlLoader {picker} {allowHttp} {resolveUrl} />
        </div>
      {/if}
    </div>
  </div>
{/if}
