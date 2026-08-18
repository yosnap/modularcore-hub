import { useEffect, useRef, useState } from 'react';

import { MediaPicker } from '../../core/media-picker.js';

import type { CompressOptions } from '../../core/canvas/compress.js';
import type { CropOptions } from '../../core/canvas/crop.js';
import type { FlipAxis, RotateDirection, TransformOptions } from '../../core/canvas/transform.js';
import type {
  LibraryItem,
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

export interface UseMediaPickerResult {
  state: MediaPickerState;
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
  listFolders: (provider: StorageProvider) => Promise<void>;
  createFolder: (provider: StorageProvider, name: string) => Promise<StorageFolder>;
}

/**
 * Binds `MediaPicker` (headless core) to React state. No business logic lives here — every
 * action just forwards to the core instance, which owns the state machine and notifies this
 * hook via `subscribe`.
 */
export function useMediaPicker(
  deps?: Partial<MediaPickerDeps>,
  config?: MediaPickerConfig,
): UseMediaPickerResult {
  const pickerRef = useRef<MediaPicker | null>(null);
  if (!pickerRef.current) pickerRef.current = new MediaPicker(deps, config);
  const picker = pickerRef.current;

  const [state, setState] = useState<MediaPickerState>(() => picker.getState());

  useEffect(() => picker.subscribe(setState), [picker]);

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
    listFolders: (provider) => picker.listFolders(provider),
    createFolder: (provider, name) => picker.createFolder(provider, name),
  };
}
