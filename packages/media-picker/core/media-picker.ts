import { compressImage } from './canvas/compress.js';
import { cropImage } from './canvas/crop.js';
import { fromLibrary, fromLocalFile, fromRemoteUrl } from './sources.js';

import type { CompressOptions } from './canvas/compress.js';
import type { CropOptions } from './canvas/crop.js';
import type { RemoteUrlSourceOptions } from './sources.js';
import type { StorageProvider, UploadOptions, UploadResult } from './provider.js';

export type MediaPickerStatus =
  'idle' | 'cropping' | 'compressing' | 'uploading' | 'done' | 'error';

export interface MediaPickerState {
  status: MediaPickerStatus;
  blob: Blob | null;
  result: UploadResult | null;
  error: Error | null;
  progress: number | null;
}

export type MediaPickerListener = (state: MediaPickerState) => void;

export interface MediaPickerDeps {
  cropImage: typeof cropImage;
  compressImage: typeof compressImage;
  fromRemoteUrl: typeof fromRemoteUrl;
  fromLibrary: typeof fromLibrary;
}

const initialState: MediaPickerState = {
  status: 'idle',
  blob: null,
  result: null,
  error: null,
  progress: null,
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

  constructor(deps: Partial<MediaPickerDeps> = {}) {
    this.deps = {
      cropImage: deps.cropImage ?? cropImage,
      compressImage: deps.compressImage ?? compressImage,
      fromRemoteUrl: deps.fromRemoteUrl ?? fromRemoteUrl,
      fromLibrary: deps.fromLibrary ?? fromLibrary,
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
    this.setState({ ...initialState });
  }
}

export function fromFile(file: File): Blob {
  return fromLocalFile(file);
}
