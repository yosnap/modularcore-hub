import type { ListedObject, ListPage } from './provider.js';

/** A library entry the user can select — same shape the provider's `list()` returns. */
export type LibraryItem = ListedObject;

export interface MediaPickerConfig {
  /** When `false` (the default), selection holds at most one item — see `toggleSelection`. */
  multiple?: boolean;
  /** Ignored when `multiple` is `false`. No cap when omitted. */
  maxSelection?: number;
}

/**
 * Toggles `item` in/out of `selection` by `key`. Removing an already-selected item always
 * succeeds. Adding a new item is rejected (selection returned unchanged, `rejected: true`)
 * once `maxSelection` is reached — chosen over throwing so a UI can just disable/no-op the
 * click instead of wiring a try/catch around every toggle, and over silently evicting the
 * oldest selection (which would surprise a user who did not ask for that item to be dropped).
 * When `config.multiple` is `false`, selecting a *different* item replaces the whole
 * selection (single-select), matching the pre-v2 one-blob-at-a-time model.
 */
export function toggleSelection(
  selection: readonly LibraryItem[],
  item: LibraryItem,
  config: MediaPickerConfig,
): { selection: LibraryItem[]; rejected: boolean } {
  const alreadySelected = selection.some((existing) => existing.key === item.key);

  if (alreadySelected) {
    return {
      selection: selection.filter((existing) => existing.key !== item.key),
      rejected: false,
    };
  }

  if (!config.multiple) {
    return { selection: [item], rejected: false };
  }

  if (config.maxSelection !== undefined && selection.length >= config.maxSelection) {
    return { selection: [...selection], rejected: true };
  }

  return { selection: [...selection, item], rejected: false };
}

/**
 * Merges a freshly-fetched `ListPage` into the library's current item list. A page fetched
 * with a `cursor` is appended (pagination, "load more"); a page fetched without one replaces
 * the list (fresh listing — e.g. the folder or mimeType filter changed).
 */
export function mergeLibraryPage(
  previousItems: readonly LibraryItem[],
  page: ListPage,
  hadCursor: boolean,
): { items: LibraryItem[]; nextCursor: string | null } {
  const items = hadCursor ? [...previousItems, ...page.items] : [...page.items];
  return { items, nextCursor: page.nextCursor ?? null };
}

/**
 * A page-index-to-cursor cache for numbered pagination over a cursor-only `list()` contract.
 * S3/Cloudinary continuation tokens are opaque and cannot be reconstructed from a page number
 * alone, so this cache remembers the cursor that produced each page as the user visits it:
 * revisiting an already-seen page is free, jumping ahead of the last-visited page requires
 * walking forward sequentially first (see `cursorForPage`). Distinct from `mergeLibraryPage`'s
 * infinite-scroll accumulator above — this is the pure-state half of `MediaPicker.listPage()`
 * (`core/media-picker.ts`), which always REPLACES `libraryItems` rather than appending.
 */
export interface PageCache {
  /** cursor to fetch page N; page 1 has no cursor (undefined). */
  cursorsByPage: Map<number, string | undefined>;
  /** highest page number we know exists (grows as user pages forward). */
  knownPages: number;
  currentPage: number;
  /** libraryGeneration value active when this cache was created/last reset — see recordPageCursor. */
  generation: number;
}

/** Builds a fresh PageCache tagged with `generation` — page 1 is always reachable (no cursor needed). */
export function initPageCache(generation: number): PageCache {
  return {
    cursorsByPage: new Map([[1, undefined]]),
    knownPages: 1,
    currentPage: 1,
    generation,
  };
}

/**
 * Builds a fresh PageCache tagged with the current generation — called whenever folder/query/
 * sort changes. Same as `initPageCache`; kept as a separately named export purely for call-site
 * clarity (a reset reads differently from an initial construction even though the logic is
 * identical).
 */
export function resetPageCache(generation: number): PageCache {
  return initPageCache(generation);
}

/**
 * Records the cursor for `page + 1` once a page's `ListPage.nextCursor` is known. Pure —
 * returns a new PageCache, UNLESS `responseGeneration !== cache.generation` (the cache was
 * reset by a filter/query/sort change after this response's request was sent), in which case
 * `cache` is returned unchanged — a no-op guard against stale-response cache poisoning. Also a
 * no-op when `nextCursor` is `undefined` (no next page to record — end of the list).
 */
export function recordPageCursor(
  cache: PageCache,
  page: number,
  nextCursor: string | undefined,
  responseGeneration: number,
): PageCache {
  if (responseGeneration !== cache.generation) return cache;
  if (nextCursor === undefined) return cache;

  const cursorsByPage = new Map(cache.cursorsByPage);
  cursorsByPage.set(page + 1, nextCursor);
  return {
    ...cache,
    cursorsByPage,
    knownPages: Math.max(cache.knownPages, page + 1),
  };
}

/** Cursor to request for `targetPage`, or `undefined` if it must be walked sequentially first (caller fetches 1..targetPage-1 first). */
export function cursorForPage(
  cache: PageCache,
  targetPage: number,
): { cursor: string | undefined; reachable: boolean } {
  if (cache.cursorsByPage.has(targetPage)) {
    return { cursor: cache.cursorsByPage.get(targetPage), reachable: true };
  }
  return { cursor: undefined, reachable: false };
}
