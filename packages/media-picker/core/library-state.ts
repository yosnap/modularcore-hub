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
