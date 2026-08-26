import { describe, expect, it } from 'vitest';

import {
  cursorForPage,
  initPageCache,
  mergeLibraryPage,
  recordPageCursor,
  resetPageCache,
  toggleSelection,
} from '../core/library-state.js';

import type { LibraryItem } from '../core/library-state.js';

function item(key: string): LibraryItem {
  return { key, url: `https://cdn.example.com/${key}`, size: 1 };
}

describe('toggleSelection', () => {
  it('single-select (multiple: false): selecting a new item replaces the selection', () => {
    const first = toggleSelection([], item('a'), { multiple: false });
    expect(first.selection).toEqual([item('a')]);

    const second = toggleSelection(first.selection, item('b'), { multiple: false });
    expect(second.selection).toEqual([item('b')]);
    expect(second.rejected).toBe(false);
  });

  it('single-select: clicking the already-selected item deselects it', () => {
    const { selection } = toggleSelection([item('a')], item('a'), { multiple: false });
    expect(selection).toEqual([]);
  });

  it('multiselect: accumulates distinct items', () => {
    let selection: LibraryItem[] = [];
    ({ selection } = toggleSelection(selection, item('a'), { multiple: true }));
    ({ selection } = toggleSelection(selection, item('b'), { multiple: true }));
    expect(selection).toEqual([item('a'), item('b')]);
  });

  it('multiselect: toggling an already-selected item removes only that item', () => {
    const { selection } = toggleSelection([item('a'), item('b')], item('a'), { multiple: true });
    expect(selection).toEqual([item('b')]);
  });

  it('multiselect: rejects a new selection once maxSelection is reached, leaving selection unchanged', () => {
    const atLimit = [item('a'), item('b')];
    const result = toggleSelection(atLimit, item('c'), { multiple: true, maxSelection: 2 });
    expect(result.rejected).toBe(true);
    expect(result.selection).toEqual(atLimit);
  });

  it('multiselect: deselecting still works at the limit', () => {
    const atLimit = [item('a'), item('b')];
    const result = toggleSelection(atLimit, item('a'), { multiple: true, maxSelection: 2 });
    expect(result.rejected).toBe(false);
    expect(result.selection).toEqual([item('b')]);
  });
});

describe('mergeLibraryPage', () => {
  it('replaces the previous items when the page was fetched without a cursor', () => {
    const previous = [item('old')];
    const { items, nextCursor } = mergeLibraryPage(
      previous,
      { items: [item('a')], nextCursor: 'c2' },
      false,
    );
    expect(items).toEqual([item('a')]);
    expect(nextCursor).toBe('c2');
  });

  it('appends the page when it was fetched with a cursor (pagination)', () => {
    const previous = [item('a')];
    const { items, nextCursor } = mergeLibraryPage(previous, { items: [item('b')] }, true);
    expect(items).toEqual([item('a'), item('b')]);
    expect(nextCursor).toBeNull();
  });
});

describe('PageCache (page-index-to-cursor cache for numbered pagination)', () => {
  it('page 1 is reachable with no cursor from a freshly-initialized cache', () => {
    const cache = initPageCache(0);
    expect(cursorForPage(cache, 1)).toEqual({ cursor: undefined, reachable: true });
    expect(cache.currentPage).toBe(1);
    expect(cache.knownPages).toBe(1);
  });

  it('records the cursor for the next page once known, enabling sequential forward paging', () => {
    let cache = initPageCache(0);
    cache = recordPageCursor(cache, 1, 'c2', 0);
    expect(cursorForPage(cache, 2)).toEqual({ cursor: 'c2', reachable: true });
    expect(cache.knownPages).toBe(2);

    cache = recordPageCursor(cache, 2, 'c3', 0);
    expect(cursorForPage(cache, 3)).toEqual({ cursor: 'c3', reachable: true });
    expect(cache.knownPages).toBe(3);
  });

  it('a jump to an already-visited page is a cache hit (returns the same cursor without walking)', () => {
    let cache = initPageCache(0);
    cache = recordPageCursor(cache, 1, 'c2', 0);
    cache = recordPageCursor(cache, 2, 'c3', 0);
    expect(cursorForPage(cache, 2)).toEqual({ cursor: 'c2', reachable: true });
    expect(cursorForPage(cache, 1)).toEqual({ cursor: undefined, reachable: true });
  });

  it('a jump past the last known page is marked unreachable — caller must walk forward', () => {
    let cache = initPageCache(0);
    cache = recordPageCursor(cache, 1, 'c2', 0);
    expect(cache.knownPages).toBe(2);
    expect(cursorForPage(cache, 5)).toEqual({ cursor: undefined, reachable: false });
  });

  it('recordPageCursor is a no-op once the list ends (nextCursor undefined)', () => {
    const cache = initPageCache(0);
    const unchanged = recordPageCursor(cache, 1, undefined, 0);
    expect(unchanged).toBe(cache);
  });

  it('resetPageCache builds a fresh cache tagged with the given generation (used on filter change)', () => {
    const cache = resetPageCache(3);
    expect(cache.generation).toBe(3);
    expect(cache.currentPage).toBe(1);
    expect(cache.knownPages).toBe(1);
    expect(cursorForPage(cache, 1)).toEqual({ cursor: undefined, reachable: true });
  });

  it('recordPageCursor is a no-op against a cache whose generation has moved on (stale-response guard)', () => {
    // Simulates: a filter change reset the cache to generation 1 while an older generation-0
    // response was still in flight — that stale response must not poison the new cache.
    const freshCache = resetPageCache(1);
    const stale = recordPageCursor(freshCache, 1, 'stale-cursor', 0);
    expect(stale).toBe(freshCache);
    expect(cursorForPage(stale, 2)).toEqual({ cursor: undefined, reachable: false });
  });
});
