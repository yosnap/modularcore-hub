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

export interface MediaPickerStore {
  getState: () => MediaPickerState;
  /**
   * Registra un oyente y lo invoca de inmediato con el estado actual, de modo que el primer
   * pintado no necesita una llamada aparte a `getState`. Devuelve la función para darse de baja.
   */
  subscribe: (listener: (state: MediaPickerState) => void) => () => void;
  /** Da de baja todos los oyentes registrados a través de este store. */
  destroy: () => void;
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
 * Binding sin framework para el núcleo headless `MediaPicker`.
 *
 * Los demás adaptadores traducen el estado del núcleo al sistema reactivo de su framework —un
 * ref de Vue, una rune de Svelte— y aprovechan su ciclo de vida para darse de baja. Aquí no hay
 * ninguno de los dos, así que el store expone la suscripción tal cual y deja la limpieza en
 * manos de quien lo crea: llama a `destroy()` al desmontar la isla, la página o el widget.
 *
 * Es lo que necesitan Astro (cuya interactividad son `<script>` con TypeScript plano), Blade,
 * HTMX, Rails o cualquier página sin framework. Como el núcleo no toca APIs del navegador al
 * construirse, crear el store durante el renderizado en servidor es seguro; las acciones que sí
 * usan canvas o `fetch` deben ejecutarse ya en el cliente.
 */
export function createMediaPickerStore(
  deps?: Partial<MediaPickerDeps>,
  config?: MediaPickerConfig,
): MediaPickerStore {
  const picker = new MediaPicker(deps, config);
  const unsubscribes = new Set<() => void>();

  return {
    getState: () => picker.getState(),
    subscribe: (listener) => {
      const unsubscribe = picker.subscribe(listener);
      unsubscribes.add(unsubscribe);
      listener(picker.getState());

      return () => {
        unsubscribes.delete(unsubscribe);
        unsubscribe();
      };
    },
    destroy: () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
      unsubscribes.clear();
    },
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
