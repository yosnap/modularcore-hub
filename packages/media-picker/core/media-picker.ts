import { compressImage } from './canvas/compress.js';
import { cropImage } from './canvas/crop.js';
import { flip, rotate90 } from './canvas/transform.js';
import {
  cursorForPage,
  initPageCache,
  mergeLibraryPage,
  recordPageCursor,
  resetPageCache,
  toggleSelection,
} from './library-state.js';
import { fromLibrary, fromLocalFile, fromRemoteUrl } from './sources.js';

import type { CompressOptions } from './canvas/compress.js';
import type { CropOptions } from './canvas/crop.js';
import type { FlipAxis, RotateDirection, TransformOptions } from './canvas/transform.js';
import type { LibraryItem, MediaPickerConfig, PageCache } from './library-state.js';
import type { RemoteUrlSourceOptions } from './sources.js';
import type {
  ListOptions,
  StorageFolder,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from './provider.js';

export type { LibraryItem, MediaPickerConfig, PageCache } from './library-state.js';

/** Options for `MediaPicker.listPage()` — a `ListOptions` plus the (1-based) page to fetch. */
export interface ListLibraryPageOptions extends ListOptions {
  page: number;
}

export type MediaPickerStatus =
  'idle' | 'cropping' | 'compressing' | 'uploading' | 'done' | 'error';

export interface MediaPickerState {
  status: MediaPickerStatus;
  blob: Blob | null;
  result: UploadResult | null;
  error: Error | null;
  progress: number | null;
  /** Accumulated library picks. Holds at most one item unless the picker was built with `multiple: true`. */
  selection: LibraryItem[];
  libraryItems: LibraryItem[];
  libraryNextCursor: string | null;
  libraryLoading: boolean;
  libraryError: Error | null;
  /** Page-index-to-cursor cache backing `listPage()`/`syncLibrary()` numbered pagination. See `PageCache` in `library-state.ts`. */
  libraryPage: PageCache;
  /** Last search text passed to `listPage()`/`syncLibrary()`. Empty string when unset. */
  libraryQuery: string;
  /** Last sort order passed to `listPage()`/`syncLibrary()`. */
  librarySort: ListOptions['sort'];
  folders: StorageFolder[];
  foldersLoading: boolean;
  foldersError: Error | null;
}

export type MediaPickerListener = (state: MediaPickerState) => void;

export interface MediaPickerDeps {
  cropImage: typeof cropImage;
  compressImage: typeof compressImage;
  rotate90: typeof rotate90;
  flip: typeof flip;
  fromRemoteUrl: typeof fromRemoteUrl;
  fromLibrary: typeof fromLibrary;
}

const initialState: MediaPickerState = {
  status: 'idle',
  blob: null,
  result: null,
  error: null,
  progress: null,
  selection: [],
  libraryItems: [],
  libraryNextCursor: null,
  libraryLoading: false,
  libraryError: null,
  libraryPage: initPageCache(0),
  libraryQuery: '',
  librarySort: undefined,
  folders: [],
  foldersLoading: false,
  foldersError: null,
};

/**
 * Headless orchestrator: holds current state + blob, delegates actual work to
 * sources/crop/compress/provider, and notifies subscribers on every transition. No UI, no
 * DOM — `adapters/react` and `adapters/svelte` are thin bindings over this.
 */
export class MediaPicker {
  private state: MediaPickerState = { ...initialState };
  private readonly listeners = new Set<MediaPickerListener>();
  private readonly deps: MediaPickerDeps;
  // Bumped by every call that invalidates in-flight work (reset, loadLocalFile, and the start
  // of each async action below). An async action only applies its result if this is still the
  // generation it started with — otherwise a slow `loadFromUrl`/`upload` that resolves after a
  // `reset()` or a newer action started would silently overwrite state the caller already
  // moved past (classic out-of-order-resolution bug: no cancellation, so the stale promise
  // still settles, it just must not win).
  private generation = 0;
  // Separate from `generation` on purpose: a slow crop()/upload() and a slow listLibrary()/
  // listFolders() are unrelated concerns (one owns the single working blob, the other owns
  // the library browsing view), so a listing call must not drop an in-flight crop's result
  // and vice versa. Each still gets its own last-one-wins guard via `runLibrary` below —
  // "same pattern as `run()`/`commitIfCurrent`", just scoped to library state instead of
  // sharing the blob-generation counter.
  private libraryGeneration = 0;
  // Separate from `libraryGeneration` on purpose: `listFolders()` and `listLibrary()`/
  // `listPage()` are independent requests that are fired concurrently on every modal open
  // (see `MediaLibraryModal`'s mount effect). Sharing one counter between them meant a
  // `listFolders()` call racing a `listPage()` call would bump the shared generation and cause
  // `listPage()`'s own response to be dropped as "stale" by `ifCurrent`, leaving
  // `libraryLoading` stuck `true` forever — reproduced live via the Phase 4 browser QA pass.
  private foldersGeneration = 0;
  // Snapshot of the filters (everything in ListOptions except `page`/`cursor`) that produced
  // the current `state.libraryPage` cache, tracked as a stable string key so `listPage()` can
  // detect a folder/mimeTypes/scope/query/sort change and reset the cache instead of trying to
  // reuse cursors minted under a different filter set. `null` until the first `listPage()` call.
  private libraryFilterKey: string | null = null;
  // The filters themselves (minus `page`), remembered so `syncLibrary()` can re-request the
  // current page without the caller having to repeat folder/query/sort by hand.
  private libraryFilters: ListOptions = {};
  private readonly config: Required<MediaPickerConfig>;

  constructor(deps: Partial<MediaPickerDeps> = {}, config: MediaPickerConfig = {}) {
    this.deps = {
      cropImage: deps.cropImage ?? cropImage,
      compressImage: deps.compressImage ?? compressImage,
      rotate90: deps.rotate90 ?? rotate90,
      flip: deps.flip ?? flip,
      fromRemoteUrl: deps.fromRemoteUrl ?? fromRemoteUrl,
      fromLibrary: deps.fromLibrary ?? fromLibrary,
    };
    this.config = {
      multiple: config.multiple ?? false,
      maxSelection: config.maxSelection ?? Infinity,
    };
  }

  getState(): MediaPickerState {
    return this.state;
  }

  subscribe(listener: MediaPickerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<MediaPickerState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  /**
   * Runs `action`, tagging it with the generation active when it started. Every `setState`
   * call tied to this action — including the ones callers make after `run` resolves — must
   * go through `commit`/`commitIfCurrent` instead of `setState` directly, so a result that
   * resolves after a newer action (or `reset`) has moved the picker on gets dropped instead
   * of clobbering current state.
   */
  private async run<T>(
    status: MediaPickerStatus,
    action: (gen: number) => Promise<T>,
  ): Promise<[T, number]> {
    const gen = ++this.generation;
    this.setState({ status, error: null });
    try {
      const result = await action(gen);
      return [result, gen];
    } catch (error) {
      if (gen !== this.generation) throw error; // superseded: don't report a stale error either
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.setState({ status: 'error', error: normalized });
      throw normalized;
    }
  }

  private commitIfCurrent(gen: number, patch: Partial<MediaPickerState>): void {
    if (gen === this.generation) this.setState(patch);
  }

  loadLocalFile(file: File): void {
    this.generation++;
    this.setState({ status: 'idle', blob: file, result: null, error: null, progress: null });
  }

  async loadFromUrl(url: string, options?: RemoteUrlSourceOptions): Promise<void> {
    const [blob, gen] = await this.run('idle', () => this.deps.fromRemoteUrl(url, options));
    this.commitIfCurrent(gen, { blob, result: null });
  }

  async loadFromLibrary(provider: StorageProvider, key: string): Promise<void> {
    const [blob, gen] = await this.run('idle', () => this.deps.fromLibrary(provider, key));
    this.commitIfCurrent(gen, { blob, result: null });
  }

  async crop(options: CropOptions): Promise<void> {
    if (!this.state.blob) throw new Error('media-picker: crop() called with no source loaded');
    const source = this.state.blob;
    const [blob, gen] = await this.run('cropping', () => this.deps.cropImage(source, options));
    this.commitIfCurrent(gen, { status: 'idle', blob });
  }

  async compress(options?: CompressOptions): Promise<void> {
    if (!this.state.blob) throw new Error('media-picker: compress() called with no source loaded');
    const source = this.state.blob;
    const [blob, gen] = await this.run('compressing', () =>
      this.deps.compressImage(source, options),
    );
    this.commitIfCurrent(gen, { status: 'idle', blob });
  }

  /** Rotates the current working blob 90°. Part of the image-editor pipeline (rotate/flip/crop), same "one blob at a time" state machine as crop()/compress(). */
  async rotate(direction: RotateDirection, options?: TransformOptions): Promise<void> {
    if (!this.state.blob) throw new Error('media-picker: rotate() called with no source loaded');
    const source = this.state.blob;
    const [blob, gen] = await this.run('cropping', () =>
      this.deps.rotate90(source, direction, options),
    );
    this.commitIfCurrent(gen, { status: 'idle', blob });
  }

  /** Flips the current working blob across `axis`. See `rotate()`. */
  async flip(axis: FlipAxis, options?: TransformOptions): Promise<void> {
    if (!this.state.blob) throw new Error('media-picker: flip() called with no source loaded');
    const source = this.state.blob;
    const [blob, gen] = await this.run('cropping', () => this.deps.flip(source, axis, options));
    this.commitIfCurrent(gen, { status: 'idle', blob });
  }

  async upload(provider: StorageProvider, options?: UploadOptions): Promise<UploadResult> {
    if (!this.state.blob) throw new Error('media-picker: upload() called with no source loaded');
    const source = this.state.blob;
    const [result, gen] = await this.run('uploading', (runGen) =>
      provider.upload(source, {
        ...options,
        onProgress: (loaded, total) => {
          this.commitIfCurrent(runGen, { progress: total > 0 ? loaded / total : null });
          options?.onProgress?.(loaded, total);
        },
      }),
    );
    this.commitIfCurrent(gen, { status: 'done', result, progress: 1 });
    return result;
  }

  reset(): void {
    this.generation++;
    this.libraryGeneration++;
    this.foldersGeneration++;
    this.libraryFilterKey = null;
    this.libraryFilters = {};
    this.setState({ ...initialState, libraryPage: initPageCache(this.libraryGeneration) });
  }

  /**
   * Toggles `item` in/out of the accumulated `selection` (see `toggleSelection` in
   * `library-state.ts` for the exact rules, including what happens at `maxSelection`).
   * Synchronous and does not touch `generation` — selection is independent of the single
   * working blob the crop/compress/upload pipeline operates on.
   */
  toggleLibrarySelection(item: LibraryItem): void {
    const { selection } = toggleSelection(this.state.selection, item, this.config);
    this.setState({ selection });
  }

  clearSelection(): void {
    this.setState({ selection: [] });
  }

  /** Returns a snapshot of the current selection. Does not clear it — call `clearSelection()` separately if desired. */
  confirmSelection(): LibraryItem[] {
    return [...this.state.selection];
  }

  /**
   * Runs a `listLibrary`/`listPage`/`syncLibrary` async `action`, tagging it with the
   * `libraryGeneration` active when it started — same last-one-wins pattern as `run()`, kept
   * in a separate counter (see the field comment above). `onSettled` always runs so loading
   * flags get cleared even for a superseded call; the caller decides what to store from
   * `result`/`error` and whether that decision only applies `ifCurrent`.
   */
  private runLibrary<T>(
    action: () => Promise<T>,
    onSettled: (
      outcome: { result: T; error: null } | { result: null; error: Error },
      ifCurrent: (patch: Partial<MediaPickerState>) => void,
    ) => void,
  ): Promise<void> {
    return this.runGuarded(
      () => ++this.libraryGeneration,
      (gen) => gen === this.libraryGeneration,
      action,
      onSettled,
    );
  }

  /**
   * Same guard pattern as `runLibrary`, but for `listFolders()` — a distinct counter so a
   * folder fetch racing a library-page fetch can't drop the other's response as stale (see
   * `foldersGeneration`'s field comment).
   */
  private runFolders<T>(
    action: () => Promise<T>,
    onSettled: (
      outcome: { result: T; error: null } | { result: null; error: Error },
      ifCurrent: (patch: Partial<MediaPickerState>) => void,
    ) => void,
  ): Promise<void> {
    return this.runGuarded(
      () => ++this.foldersGeneration,
      (gen) => gen === this.foldersGeneration,
      action,
      onSettled,
    );
  }

  private async runGuarded<T>(
    bumpGeneration: () => number,
    isCurrent: (gen: number) => boolean,
    action: () => Promise<T>,
    onSettled: (
      outcome: { result: T; error: null } | { result: null; error: Error },
      ifCurrent: (patch: Partial<MediaPickerState>) => void,
    ) => void,
  ): Promise<void> {
    const gen = bumpGeneration();
    const ifCurrent = (patch: Partial<MediaPickerState>): void => {
      if (isCurrent(gen)) this.setState(patch);
    };
    try {
      const result = await action();
      onSettled({ result, error: null }, ifCurrent);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      onSettled({ result: null, error: normalized }, ifCurrent);
    }
  }

  /**
   * Lists library items from `provider`. A page fetched with `options.cursor` is appended to
   * the existing `libraryItems` (pagination); one fetched without a cursor replaces them
   * (fresh listing, e.g. after switching folders). Guarded so a slow response cannot
   * overwrite a newer one — e.g. the user switches folders again before the first list()
   * resolves.
   */
  async listLibrary(provider: StorageProvider, options?: ListOptions): Promise<void> {
    this.setState({ libraryLoading: true, libraryError: null });
    const previousItems = this.state.libraryItems;
    await this.runLibrary(
      () => provider.list(options),
      (outcome, ifCurrent) => {
        if (outcome.error) {
          ifCurrent({ libraryLoading: false, libraryError: outcome.error });
          return;
        }
        const { items, nextCursor } = mergeLibraryPage(
          previousItems,
          outcome.result,
          !!options?.cursor,
        );
        ifCurrent({ libraryItems: items, libraryNextCursor: nextCursor, libraryLoading: false });
      },
    );
  }

  /**
   * Numbered-pagination counterpart to `listLibrary()` — always REPLACES `libraryItems` with
   * exactly `options.page`'s items, never appends, regardless of whether a cursor was used
   * (see `library-state.ts`'s `PageCache` doc comment for why `listLibrary`/`mergeLibraryPage`
   * cannot serve this: their cursor-present-means-append rule would concatenate pages).
   *
   * Resolves `options.page` against the cached page-to-cursor map. Changing any filter
   * (`folder`/`mimeTypes`/`scope`/`query`/`sort`) versus the last call resets that cache and
   * restarts at page 1, regardless of which page was requested — a filter change invalidates
   * every previously-recorded cursor. Requesting a page beyond the last known one throws
   * instead of silently fetching the wrong page — the caller (UI) must walk forward
   * sequentially first, see `cursorForPage`'s doc comment.
   */
  async listPage(provider: StorageProvider, options: ListLibraryPageOptions): Promise<void> {
    const { page: requestedPage, ...filters } = options;
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      throw new Error('media-picker: listPage() page must be a 1-based integer');
    }

    const filterKey = JSON.stringify([
      filters.folder,
      filters.mimeTypes,
      filters.scope,
      filters.query,
      filters.sort,
    ]);
    const filterChanged = filterKey !== this.libraryFilterKey;
    this.libraryFilterKey = filterKey;
    this.libraryFilters = filters;

    const cache = filterChanged
      ? resetPageCache(this.libraryGeneration + 1) // matches the gen `runLibrary` assigns below — safe because no await happens between this line and that call, so nothing else can bump `libraryGeneration` in between
      : this.state.libraryPage;
    const page = filterChanged ? 1 : requestedPage;

    const { cursor, reachable } = cursorForPage(cache, page);
    if (!reachable) {
      throw new Error(
        `media-picker: listPage() page ${page} has not been walked to yet — fetch the intervening pages first`,
      );
    }

    const requestEpoch = cache.generation;
    this.setState({
      libraryPage: cache,
      libraryQuery: filters.query ?? '',
      librarySort: filters.sort,
      libraryLoading: true,
      libraryError: null,
    });

    await this.runLibrary(
      () => provider.list({ ...filters, cursor }),
      (outcome, ifCurrent) => {
        if (outcome.error) {
          ifCurrent({ libraryLoading: false, libraryError: outcome.error });
          return;
        }
        const libraryPage: PageCache = {
          ...recordPageCursor(
            this.state.libraryPage,
            page,
            outcome.result.nextCursor,
            requestEpoch,
          ),
          currentPage: page,
        };
        ifCurrent({
          libraryItems: [...outcome.result.items],
          libraryNextCursor: outcome.result.nextCursor ?? null,
          libraryLoading: false,
          libraryPage,
        });
      },
    );
  }

  /**
   * Re-fetches the current page (`state.libraryPage.currentPage`) with the same filters as the
   * last `listPage()` call, without resetting the cache or the current page position — backs
   * the "Sincronizar" button. Defaults to page 1 with no filters when called before any
   * `listPage()`.
   */
  async syncLibrary(provider: StorageProvider): Promise<void> {
    await this.listPage(provider, {
      ...this.libraryFilters,
      page: this.state.libraryPage.currentPage,
    });
  }

  async listFolders(provider: StorageProvider): Promise<void> {
    if (!provider.listFolders) {
      throw new Error('media-picker: listFolders() called but the provider does not implement it');
    }
    this.setState({ foldersLoading: true, foldersError: null });
    await this.runFolders(
      () => provider.listFolders!(),
      (outcome, ifCurrent) => {
        if (outcome.error) {
          ifCurrent({ foldersLoading: false, foldersError: outcome.error });
          return;
        }
        ifCurrent({ folders: outcome.result, foldersLoading: false });
      },
    );
  }

  async createFolder(provider: StorageProvider, name: string): Promise<StorageFolder> {
    if (!provider.createFolder) {
      throw new Error('media-picker: createFolder() called but the provider does not implement it');
    }
    const folder = await provider.createFolder(name);
    this.setState({ folders: [...this.state.folders, folder] });
    return folder;
  }
}

export function fromFile(file: File): Blob {
  return fromLocalFile(file);
}
