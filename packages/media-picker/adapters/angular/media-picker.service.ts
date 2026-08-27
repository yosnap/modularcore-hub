import { signal } from '@angular/core';

import { MediaPicker } from '../../core/media-picker.js';

import type { DestroyRef, Signal } from '@angular/core';
import type { CompressOptions } from '../../core/canvas/compress.js';
import type { CropOptions } from '../../core/canvas/crop.js';
import type { FlipAxis, RotateDirection, TransformOptions } from '../../core/canvas/transform.js';
import type {
  LibraryItem,
  ListLibraryPageOptions,
  MediaPickerConfig,
  MediaPickerDeps,
  MediaPickerState,
} from '../../core/media-picker.js';
import type {
  ListOptions,
  StorageFolder,
  StorageProvider,
  UploadOptions,
} from '../../core/provider.js';
import type { RemoteUrlSourceOptions } from '../../core/sources.js';

/**
 * Per-component Angular binding for the headless media picker. Create it in a standalone
 * component/directive with that instance's `DestroyRef`; it is deliberately not a root service.
 */
export interface MediaPickerService {
  readonly state: Signal<MediaPickerState>;
  loadLocalFile: (file: File) => void;
  loadFromUrl: (url: string, options?: RemoteUrlSourceOptions) => Promise<void>;
  loadFromLibrary: (provider: StorageProvider, key: string) => Promise<void>;
  crop: (options: CropOptions) => Promise<void>;
  compress: (options?: CompressOptions) => Promise<void>;
  rotate: (direction: RotateDirection, options?: TransformOptions) => Promise<void>;
  flip: (axis: FlipAxis, options?: TransformOptions) => Promise<void>;
  upload: (provider: StorageProvider, options?: UploadOptions) => Promise<void>;
  reset: () => void;
  toggleLibrarySelection: (item: LibraryItem) => void;
  clearSelection: () => void;
  confirmSelection: () => LibraryItem[];
  listLibrary: (provider: StorageProvider, options?: ListOptions) => Promise<void>;
  listPage: (provider: StorageProvider, options: ListLibraryPageOptions) => Promise<void>;
  syncLibrary: (provider: StorageProvider) => Promise<void>;
  listFolders: (provider: StorageProvider) => Promise<void>;
  createFolder: (provider: StorageProvider, name: string) => Promise<StorageFolder>;
}

/**
 * Connects one `MediaPicker` to an Angular signal and disposes its subscription when the owning
 * standalone component/directive is destroyed. The core remains the sole state owner.
 */
export function createMediaPickerService(
  destroyRef: DestroyRef,
  deps?: Partial<MediaPickerDeps>,
  config?: MediaPickerConfig,
): MediaPickerService {
  const picker = new MediaPicker(deps, config);
  const state = signal<MediaPickerState>(picker.getState());
  let active = true;
  const unsubscribe = picker.subscribe((next) => {
    if (active) state.set(next);
  });

  destroyRef.onDestroy(() => {
    active = false;
    unsubscribe();
  });

  return {
    state: state.asReadonly(),
    loadLocalFile: (file) => picker.loadLocalFile(file),
    loadFromUrl: (url, options) => picker.loadFromUrl(url, options),
    loadFromLibrary: (provider, key) => picker.loadFromLibrary(provider, key),
    crop: (options) => picker.crop(options),
    compress: (options) => picker.compress(options),
    rotate: (direction, options) => picker.rotate(direction, options),
    flip: (axis, options) => picker.flip(axis, options),
    upload: async (provider, options) => {
      await picker.upload(provider, options);
    },
    reset: () => picker.reset(),
    toggleLibrarySelection: (item) => picker.toggleLibrarySelection(item),
    clearSelection: () => picker.clearSelection(),
    confirmSelection: () => picker.confirmSelection(),
    listLibrary: (provider, options) => picker.listLibrary(provider, options),
    listPage: (provider, options) => picker.listPage(provider, options),
    syncLibrary: (provider) => picker.syncLibrary(provider),
    listFolders: (provider) => picker.listFolders(provider),
    createFolder: (provider, name) => picker.createFolder(provider, name),
  };
}
