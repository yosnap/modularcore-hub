import { describe, expect, it, vi } from 'vitest';

import { MediaPicker } from '../core/media-picker.js';

import type { LibraryItem } from '../core/library-state.js';
import type { ListPage, StorageFolder, StorageProvider, UploadResult } from '../core/provider.js';

const idleState = {
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
  folders: [],
  foldersLoading: false,
  foldersError: null,
};

function libraryItem(key: string): LibraryItem {
  return { key, url: `https://cdn.example.com/${key}`, size: 1 };
}

function fakeProvider(
  result: UploadResult,
  list?: (options?: unknown) => Promise<ListPage>,
): StorageProvider {
  return {
    upload: vi.fn(async () => result),
    list: vi.fn(list ?? (async () => ({ items: [] }))),
    remove: vi.fn(async () => undefined),
    getUrl: (key) => `https://cdn.example.com/${key}`,
  };
}

describe('MediaPicker (state machine, collaborators injected — not the canvas output itself)', () => {
  it('starts idle with no blob', () => {
    const picker = new MediaPicker();
    expect(picker.getState()).toEqual(idleState);
  });

  it('loadLocalFile sets the blob and stays idle', () => {
    const picker = new MediaPicker();
    const file = new File(['x'], 'x.png');
    picker.loadLocalFile(file);
    expect(picker.getState().status).toBe('idle');
    expect(picker.getState().blob).toBe(file);
  });

  it('crop() transitions through "cropping" back to "idle" and updates the blob', async () => {
    const cropped = new Blob(['cropped']);
    const seen: string[] = [];
    const picker = new MediaPicker({ cropImage: vi.fn(async () => cropped) });
    picker.subscribe((s) => seen.push(s.status));
    picker.loadLocalFile(new File(['x'], 'x.png'));

    await picker.crop({ rect: { x: 0, y: 0, width: 10, height: 10 } });

    expect(seen).toContain('cropping');
    expect(picker.getState().status).toBe('idle');
    expect(picker.getState().blob).toBe(cropped);
  });

  it('compress() transitions through "compressing" back to "idle"', async () => {
    const compressed = new Blob(['compressed']);
    const picker = new MediaPicker({ compressImage: vi.fn(async () => compressed) });
    picker.loadLocalFile(new File(['x'], 'x.png'));

    await picker.compress({ quality: 0.5 });

    expect(picker.getState().status).toBe('idle');
    expect(picker.getState().blob).toBe(compressed);
  });

  it('crop() without a loaded source throws', async () => {
    const picker = new MediaPicker();
    await expect(picker.crop({ rect: { x: 0, y: 0, width: 1, height: 1 } })).rejects.toThrow(
      /no source loaded/,
    );
  });

  it('upload() transitions through "uploading" to "done" and stores the result', async () => {
    const result: UploadResult = {
      key: 'k',
      url: 'https://cdn/k',
      size: 1,
      contentType: 'image/png',
    };
    const provider = fakeProvider(result);
    const seen: string[] = [];
    const picker = new MediaPicker();
    picker.subscribe((s) => seen.push(s.status));
    picker.loadLocalFile(new File(['x'], 'x.png'));

    await picker.upload(provider);

    expect(seen).toContain('uploading');
    expect(picker.getState().status).toBe('done');
    expect(picker.getState().result).toEqual(result);
  });

  it('a failing action transitions to "error" and preserves the error', async () => {
    const boom = new Error('boom');
    const picker = new MediaPicker({ cropImage: vi.fn(async () => Promise.reject(boom)) });
    picker.loadLocalFile(new File(['x'], 'x.png'));

    await expect(picker.crop({ rect: { x: 0, y: 0, width: 1, height: 1 } })).rejects.toThrow(
      'boom',
    );
    expect(picker.getState().status).toBe('error');
    expect(picker.getState().error).toBe(boom);
  });

  it('reset() clears state back to idle', async () => {
    const picker = new MediaPicker();
    picker.loadLocalFile(new File(['x'], 'x.png'));
    picker.reset();
    expect(picker.getState()).toEqual(idleState);
  });

  it('a slow loadFromUrl that resolves after reset() does not clobber the reset state', async () => {
    let resolveFetch!: (blob: Blob) => void;
    const slowFetch = vi.fn(() => new Promise<Blob>((resolve) => (resolveFetch = resolve)));
    const picker = new MediaPicker({ fromRemoteUrl: slowFetch });

    const pending = picker.loadFromUrl('https://example.com/a.png');
    picker.reset();
    resolveFetch(new Blob(['late']));
    await pending;

    // The reset happened while loadFromUrl was still in flight; its late-arriving blob must
    // not resurrect it — this is exactly the out-of-order-resolution bug the generation guard
    // exists to prevent.
    expect(picker.getState()).toEqual(idleState);
  });

  it('a slow upload that resolves after reset() does not report stale progress or a stale result', async () => {
    let resolveUpload!: (result: UploadResult) => void;
    const provider: StorageProvider = {
      upload: vi.fn(
        (_file, opts) =>
          new Promise<UploadResult>((resolve) => {
            opts?.onProgress?.(1, 2); // in-flight progress tick before reset()
            resolveUpload = resolve;
          }),
      ),
      list: vi.fn(async () => ({ items: [] })),
      remove: vi.fn(async () => undefined),
      getUrl: (key) => `https://cdn.example.com/${key}`,
    };
    const picker = new MediaPicker();
    picker.loadLocalFile(new File(['x'], 'x.png'));

    const pending = picker.upload(provider);
    expect(picker.getState().progress).toBe(0.5); // the in-flight tick did apply before reset()
    picker.reset();
    resolveUpload({
      key: 'k',
      url: 'https://cdn.example.com/k',
      size: 1,
      contentType: 'text/plain',
    });
    await pending;

    expect(picker.getState()).toEqual(idleState);
  });

  it('subscribe() returns an unsubscribe function', () => {
    const picker = new MediaPicker();
    const listener = vi.fn();
    const unsubscribe = picker.subscribe(listener);
    unsubscribe();
    picker.loadLocalFile(new File(['x'], 'x.png'));
    expect(listener).not.toHaveBeenCalled();
  });

  describe('rotate()/flip()', () => {
    it('rotate() transitions through "cropping" back to "idle" and updates the blob', async () => {
      const rotated = new Blob(['rotated']);
      const picker = new MediaPicker({ rotate90: vi.fn(async () => rotated) });
      picker.loadLocalFile(new File(['x'], 'x.png'));

      await picker.rotate('cw');

      expect(picker.getState().status).toBe('idle');
      expect(picker.getState().blob).toBe(rotated);
    });

    it('flip() transitions through "cropping" back to "idle" and updates the blob', async () => {
      const flipped = new Blob(['flipped']);
      const picker = new MediaPicker({ flip: vi.fn(async () => flipped) });
      picker.loadLocalFile(new File(['x'], 'x.png'));

      await picker.flip('horizontal');

      expect(picker.getState().status).toBe('idle');
      expect(picker.getState().blob).toBe(flipped);
    });

    it('rotate() without a loaded source throws', async () => {
      const picker = new MediaPicker();
      await expect(picker.rotate('cw')).rejects.toThrow(/no source loaded/);
    });

    it('flip() without a loaded source throws', async () => {
      const picker = new MediaPicker();
      await expect(picker.flip('vertical')).rejects.toThrow(/no source loaded/);
    });
  });

  describe('multiselection', () => {
    it('defaults to single-select (multiple: false): selecting replaces the selection', () => {
      const picker = new MediaPicker();
      picker.toggleLibrarySelection(libraryItem('a'));
      picker.toggleLibrarySelection(libraryItem('b'));
      expect(picker.getState().selection).toEqual([libraryItem('b')]);
    });

    it('multiple: true accumulates picks and toggling an existing one removes it', () => {
      const picker = new MediaPicker({}, { multiple: true });
      picker.toggleLibrarySelection(libraryItem('a'));
      picker.toggleLibrarySelection(libraryItem('b'));
      expect(picker.getState().selection).toEqual([libraryItem('a'), libraryItem('b')]);

      picker.toggleLibrarySelection(libraryItem('a'));
      expect(picker.getState().selection).toEqual([libraryItem('b')]);
    });

    it('maxSelection rejects a new pick once reached, leaving the selection unchanged', () => {
      const picker = new MediaPicker({}, { multiple: true, maxSelection: 1 });
      picker.toggleLibrarySelection(libraryItem('a'));
      picker.toggleLibrarySelection(libraryItem('b'));
      expect(picker.getState().selection).toEqual([libraryItem('a')]);
    });

    it('clearSelection() empties the selection', () => {
      const picker = new MediaPicker({}, { multiple: true });
      picker.toggleLibrarySelection(libraryItem('a'));
      picker.clearSelection();
      expect(picker.getState().selection).toEqual([]);
    });

    it('confirmSelection() returns a snapshot without clearing it', () => {
      const picker = new MediaPicker({}, { multiple: true });
      picker.toggleLibrarySelection(libraryItem('a'));
      const confirmed = picker.confirmSelection();
      expect(confirmed).toEqual([libraryItem('a')]);
      expect(picker.getState().selection).toEqual([libraryItem('a')]);
    });
  });

  describe('listLibrary()', () => {
    it('replaces libraryItems on a fresh listing and clears libraryLoading', async () => {
      const provider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        async () => ({
          items: [libraryItem('a')],
          nextCursor: 'c2',
        }),
      );
      const picker = new MediaPicker();

      await picker.listLibrary(provider);

      expect(picker.getState().libraryItems).toEqual([libraryItem('a')]);
      expect(picker.getState().libraryNextCursor).toBe('c2');
      expect(picker.getState().libraryLoading).toBe(false);
    });

    it('appends to libraryItems when the call included a cursor (pagination)', async () => {
      let call = 0;
      const provider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        async () => {
          call += 1;
          return call === 1
            ? { items: [libraryItem('a')], nextCursor: 'c2' }
            : { items: [libraryItem('b')] };
        },
      );
      const picker = new MediaPicker();

      await picker.listLibrary(provider);
      await picker.listLibrary(provider, { cursor: 'c2' });

      expect(picker.getState().libraryItems).toEqual([libraryItem('a'), libraryItem('b')]);
      expect(picker.getState().libraryNextCursor).toBeNull();
    });

    it('passes mimeTypes/folder/scope through to the provider', async () => {
      const list = vi.fn(async () => ({ items: [] }));
      const provider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        list,
      );
      const picker = new MediaPicker();

      await picker.listLibrary(provider, { mimeTypes: ['image/png'], folder: 'f1', scope: 'mine' });

      expect(list).toHaveBeenCalledWith({ mimeTypes: ['image/png'], folder: 'f1', scope: 'mine' });
    });

    it('stores a rejection in libraryError instead of throwing', async () => {
      const boom = new Error('list failed');
      const provider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        async () => {
          throw boom;
        },
      );
      const picker = new MediaPicker();

      await picker.listLibrary(provider);

      expect(picker.getState().libraryError).toBe(boom);
      expect(picker.getState().libraryLoading).toBe(false);
    });

    it('a slow listLibrary that resolves after a newer one does not clobber it (out-of-order guard)', async () => {
      // Simulates: the user opens folder A (slow response), then switches to folder B (fast
      // response) before A resolves — A's stale page must not overwrite B's.
      let resolveSlow!: (page: { items: LibraryItem[] }) => void;
      const provider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        () => {
          return new Promise((resolve) => {
            resolveSlow = resolve;
          });
        },
      );
      const picker = new MediaPicker();

      const slowCall = picker.listLibrary(provider, { folder: 'a' });
      // Second call supersedes the first before it resolves.
      const fastProvider = fakeProvider(
        { key: 'k', url: 'u', size: 1, contentType: 'image/png' },
        async () => ({
          items: [libraryItem('fromB')],
        }),
      );
      await picker.listLibrary(fastProvider, { folder: 'b' });

      expect(picker.getState().libraryItems).toEqual([libraryItem('fromB')]);

      resolveSlow({ items: [libraryItem('fromA')] });
      await slowCall;

      // The late resolution from the superseded call must not have overwritten folder B's items.
      expect(picker.getState().libraryItems).toEqual([libraryItem('fromB')]);
    });
  });

  describe('listFolders()/createFolder()', () => {
    it('listFolders() delegates to the provider and stores the result', async () => {
      const folders: StorageFolder[] = [{ id: 'f1', name: 'Folder 1' }];
      const provider = fakeProvider({ key: 'k', url: 'u', size: 1, contentType: 'image/png' });
      provider.listFolders = vi.fn(async () => folders);
      const picker = new MediaPicker();

      await picker.listFolders(provider);

      expect(picker.getState().folders).toEqual(folders);
    });

    it('listFolders() throws when the provider does not implement it', async () => {
      const provider = fakeProvider({ key: 'k', url: 'u', size: 1, contentType: 'image/png' });
      const picker = new MediaPicker();
      await expect(picker.listFolders(provider)).rejects.toThrow(/does not implement it/);
    });

    it('createFolder() delegates to the provider and appends to folders', async () => {
      const created: StorageFolder = { id: 'f2', name: 'New folder' };
      const provider = fakeProvider({ key: 'k', url: 'u', size: 1, contentType: 'image/png' });
      provider.listFolders = vi.fn(async () => [{ id: 'f1', name: 'Folder 1' }]);
      provider.createFolder = vi.fn(async () => created);
      const picker = new MediaPicker();

      await picker.listFolders(provider);
      const result = await picker.createFolder(provider, 'New folder');

      expect(result).toEqual(created);
      expect(picker.getState().folders).toEqual([{ id: 'f1', name: 'Folder 1' }, created]);
    });

    it('createFolder() throws when the provider does not implement it', async () => {
      const provider = fakeProvider({ key: 'k', url: 'u', size: 1, contentType: 'image/png' });
      const picker = new MediaPicker();
      await expect(picker.createFolder(provider, 'x')).rejects.toThrow(/does not implement it/);
    });
  });
});
