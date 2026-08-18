/// <reference types="svelte" />
import { MediaPicker } from '../../core/media-picker.js';

import type { CompressOptions } from '../../core/canvas/compress.js';
import type { CropOptions } from '../../core/canvas/crop.js';
import type { MediaPickerDeps, MediaPickerState } from '../../core/media-picker.js';
import type { StorageProvider, UploadOptions } from '../../core/provider.js';
import type { RemoteUrlSourceOptions } from '../../core/sources.js';

export interface MediaPickerRune {
  readonly state: MediaPickerState;
  loadLocalFile: (file: File) => void;
  loadFromUrl: (url: string, options?: RemoteUrlSourceOptions) => Promise<void>;
  loadFromLibrary: (provider: StorageProvider, key: string) => Promise<void>;
  crop: (options: CropOptions) => Promise<void>;
  compress: (options?: CompressOptions) => Promise<void>;
  upload: (provider: StorageProvider, options?: UploadOptions) => Promise<void>;
  reset: () => void;
}

/**
 * Svelte 5 rune binding to `MediaPicker` (headless core). No business logic here — `state`
 * is a `$state` mirror kept in sync via `picker.subscribe`, every action just forwards.
 */
export function createMediaPicker(deps?: Partial<MediaPickerDeps>): MediaPickerRune {
  const picker = new MediaPicker(deps);
  let state = $state<MediaPickerState>(picker.getState());

  picker.subscribe((next) => {
    state = next;
  });

  return {
    get state() {
      return state;
    },
    loadLocalFile: (file) => picker.loadLocalFile(file),
    loadFromUrl: (url, options) => picker.loadFromUrl(url, options),
    loadFromLibrary: (provider, key) => picker.loadFromLibrary(provider, key),
    crop: (options) => picker.crop(options),
    compress: (options) => picker.compress(options),
    upload: async (provider, options) => {
      await picker.upload(provider, options);
    },
    reset: () => picker.reset(),
  };
}
