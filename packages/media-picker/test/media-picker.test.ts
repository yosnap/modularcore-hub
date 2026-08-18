import { describe, expect, it, vi } from 'vitest';

import { MediaPicker } from '../core/media-picker.js';

import type { StorageProvider, UploadResult } from '../core/provider.js';

function fakeProvider(result: UploadResult): StorageProvider {
  return {
    upload: vi.fn(async () => result),
    list: vi.fn(async () => []),
    remove: vi.fn(async () => undefined),
    getUrl: (key) => `https://cdn.example.com/${key}`,
  };
}

describe('MediaPicker (state machine, collaborators injected — not the canvas output itself)', () => {
  it('starts idle with no blob', () => {
    const picker = new MediaPicker();
    expect(picker.getState()).toEqual({
      status: 'idle',
      blob: null,
      result: null,
      error: null,
      progress: null,
    });
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
    expect(picker.getState()).toEqual({
      status: 'idle',
      blob: null,
      result: null,
      error: null,
      progress: null,
    });
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
    expect(picker.getState()).toEqual({
      status: 'idle',
      blob: null,
      result: null,
      error: null,
      progress: null,
    });
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
      list: vi.fn(async () => []),
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

    expect(picker.getState()).toEqual({
      status: 'idle',
      blob: null,
      result: null,
      error: null,
      progress: null,
    });
  });

  it('subscribe() returns an unsubscribe function', () => {
    const picker = new MediaPicker();
    const listener = vi.fn();
    const unsubscribe = picker.subscribe(listener);
    unsubscribe();
    picker.loadLocalFile(new File(['x'], 'x.png'));
    expect(listener).not.toHaveBeenCalled();
  });
});
