import { onUnmounted, shallowRef } from 'vue';

import { MediaPicker } from '../../core/media-picker.js';

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
import type { ShallowRef } from 'vue';

export interface UseMediaPickerResult {
  state: ShallowRef<MediaPickerState>;
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
 * Vue 3 Composition API binding for the headless `MediaPicker` core.
 *
 * Each composable call owns an isolated core instance. The core is browser-API free during
 * construction, making this safe to call from SSR setup; defer browser-only picker actions to
 * `onMounted` in the consuming component. Its subscription is disposed when the component
 * unmounts.
 */
export function useMediaPicker(
  deps?: Partial<MediaPickerDeps>,
  config?: MediaPickerConfig,
): UseMediaPickerResult {
  const picker = new MediaPicker(deps, config);
  const state = shallowRef<MediaPickerState>(picker.getState());
  const unsubscribe = picker.subscribe((next) => {
    state.value = next;
  });

  onUnmounted(unsubscribe);

  return {
    state,
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
