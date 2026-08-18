import { describe, expect, it } from 'vitest';

import { mergeLibraryPage, toggleSelection } from '../core/library-state.js';

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
