<script lang="ts">
  import { onDestroy } from 'svelte';

  import BulkActionsBar from './BulkActionsBar.svelte';
  import MediaLibraryGrid from './MediaLibraryGrid.svelte';
  import RemoteUrlLoader from './RemoteUrlLoader.svelte';

  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { LibraryItem } from '../../../core/media-picker.js';
  import type { ListOptions, StorageProvider, UploadResult } from '../../../core/provider.js';

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
    onLoaded?: (blob: Blob) => void;
    resolveUrl?: (url: string) => string;
    allowHttp?: boolean;
    multiple?: boolean;
    folders?: boolean;
  } = $props();

  let activeTab = $state<ModalTab>('library');
  let dialogEl: HTMLDivElement | undefined = $state();
  let initializedForOpen = $state(false);

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
      // Baseline: a blob that already existed before this open must not be mistaken for a
      // fresh "Desde URL" load once the user switches to that tab.
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

  /** See the headless MediaLibraryModal for why this bypasses `picker.state` entirely (Red Team
   * Finding 4, Critical) — direct `provider.upload()` per file, `picker.syncLibrary()` only after. */
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

  let lastHandledBlob: Blob | null = null;
  $effect(() => {
    const blob = picker.state.blob;
    if (activeTab === 'url' && blob && blob !== lastHandledBlob && !picker.state.error) {
      lastHandledBlob = blob;
      onLoaded?.(blob);
      onClose();
    }
  });

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

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onclick={onClose}>
    <div
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de medios"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleKeydown}
      class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 class="text-base font-semibold text-zinc-900">Biblioteca de medios</h2>
        <button type="button" onclick={onClose} aria-label="Cerrar" class="rounded-md p-1 text-zinc-500 hover:bg-zinc-100">
          ✕
        </button>
      </div>

      <div role="tablist" class="flex gap-1 border-b border-zinc-200 px-4 pt-2">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'library'}
          onclick={() => (activeTab = 'library')}
          class="border-b-2 px-3 py-2 text-sm {activeTab === 'library' ? 'border-zinc-900 font-medium text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}"
        >
          Biblioteca
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          onclick={() => (activeTab = 'upload')}
          class="border-b-2 px-3 py-2 text-sm {activeTab === 'upload' ? 'border-zinc-900 font-medium text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}"
        >
          Subir archivo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'url'}
          onclick={() => (activeTab = 'url')}
          class="border-b-2 px-3 py-2 text-sm {activeTab === 'url' ? 'border-zinc-900 font-medium text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}"
        >
          Desde URL
        </button>
      </div>

      {#if activeTab === 'library'}
        <div role="tabpanel" class="flex flex-1 flex-col overflow-y-auto p-4">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={searchInput}
              oninput={(event) => handleSearchInput(event.currentTarget.value)}
              placeholder="Buscar por nombre…"
              class="min-w-48 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onclick={handleSync}
              disabled={picker.state.libraryLoading}
              aria-busy={picker.state.libraryLoading}
              class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {picker.state.libraryLoading ? 'Sincronizando…' : '↻ Sincronizar'}
            </button>
          </div>

          {#if folders}
            <div role="group" aria-label="Carpetas" class="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={folderId === ''}
                onclick={() => handleFolderChange('')}
                class="rounded-full border px-3 py-1 text-xs {folderId === '' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'}"
              >
                Todas
              </button>
              {#each picker.state.folders as folder (folder.id)}
                <button
                  type="button"
                  aria-pressed={folderId === folder.id}
                  onclick={() => handleFolderChange(folder.id)}
                  class="rounded-full border px-3 py-1 text-xs {folderId === folder.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'}"
                >
                  {folder.name}
                </button>
              {/each}
            </div>
          {/if}

          <MediaLibraryGrid {picker} onSelectSingle={multiple ? undefined : handleSelectSingle} />

          {#if multiple}
            <div class="mt-3">
              <BulkActionsBar {picker} multiple onConfirm={handleConfirmSelection} />
            </div>
          {/if}

          <div class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
            <span>{picker.state.libraryItems.length} elementos</span>
            <div class="flex flex-wrap items-center gap-2">
              <select
                value={sortValue ?? ''}
                onchange={(event) => handleSortChange(event.currentTarget.value)}
                class="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="">Predeterminado</option>
                <option value="newest">Más recientes</option>
                <option value="oldest">Más antiguos</option>
                <option value="name">Nombre</option>
                <option value="size">Tamaño</option>
              </select>
              <select
                value={perPage}
                onchange={(event) => handlePerPageChange(Number(event.currentTarget.value))}
                class="rounded-md border border-zinc-300 px-2 py-1 text-xs"
              >
                {#each PER_PAGE_OPTIONS as option (option)}
                  <option value={option}>{option}/pág.</option>
                {/each}
              </select>
              <nav aria-label="Paginación" class="flex gap-1">
                {#each pageButtons as page (page)}
                  <button
                    type="button"
                    aria-current={page === picker.state.libraryPage.currentPage ? 'page' : undefined}
                    disabled={picker.state.libraryLoading}
                    onclick={() => handlePageClick(page)}
                    class="h-7 min-w-7 rounded-md border text-xs {page === picker.state.libraryPage.currentPage ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 hover:bg-zinc-50'}"
                  >
                    {page}
                  </button>
                {/each}
              </nav>
            </div>
          </div>
        </div>
      {:else if activeTab === 'upload'}
        <div role="tabpanel" class="flex flex-1 flex-col overflow-y-auto p-4">
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
            class="relative rounded-lg border-2 border-dashed px-6 py-10 text-center {dragOver ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300'}"
          >
            <p class="text-sm text-zinc-700">Elegí archivo(s) o arrastrá y soltá</p>
            <p class="mt-1 text-xs text-zinc-400">Imágenes de hasta 8MB, máx. 20</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onchange={handleInputChange}
              class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          {#if uploadBannerError}
            <p role="alert" class="mt-2 text-sm text-red-600">{uploadBannerError}</p>
          {/if}

          {#if uploadQueue.length > 0}
            <ul class="mt-3 flex flex-col gap-2">
              {#each uploadQueue as item (item.id)}
                <li class="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-xs">
                  <span class="flex-1 truncate">{item.file.name}</span>
                  <span class="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200">
                    <span class="block h-full bg-zinc-900" style="width:{item.progress * 100}%"></span>
                  </span>
                  {#if item.status === 'error'}
                    <span role="alert" class="text-red-600">{item.error?.message}</span>
                  {:else if item.status === 'done'}
                    <span class="text-green-600">Listo</span>
                  {:else}
                    <span class="text-zinc-400">{Math.round(item.progress * 100)}%</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <div role="tabpanel" class="p-4">
          <RemoteUrlLoader {picker} {allowHttp} {resolveUrl} />
        </div>
      {/if}
    </div>
  </div>
{/if}
