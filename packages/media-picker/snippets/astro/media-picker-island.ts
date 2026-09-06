import { createMediaPickerStore } from './adapters/vanilla/create-media-picker-store.js';
import { createS3CompatibleProvider } from './core/providers/s3-compatible.js';

import type { MediaPickerStore } from './adapters/vanilla/create-media-picker-store.js';

/**
 * Isla de Astro para el Media Picker, sin dependencia de framework.
 *
 * Astro no trae un runtime reactivo propio: la interactividad de una página vive en un
 * `<script>` con TypeScript plano, exactamente lo que este fichero hace. El mismo patrón
 * sirve tal cual en Blade, HTMX, Rails o cualquier página sin framework — solo cambia quién
 * emite el marcado.
 *
 * Marcado esperado en el `.astro`:
 *
 * ```astro
 * <div data-media-picker data-sign-url="/api/media/sign" data-public-url="https://cdn.example.com">
 *   <input type="file" accept="image/*" data-media-file />
 *   <p data-media-status></p>
 * </div>
 * <script>
 *   import { mountMediaPickers } from '../modularcore/media-picker/media-picker-island.js';
 *   mountMediaPickers();
 * </script>
 * ```
 */
export function mountMediaPicker(root: HTMLElement): MediaPickerStore | null {
  const signUrl = root.dataset.signUrl;
  const publicUrl = root.dataset.publicUrl;
  const fileInput = root.querySelector<HTMLInputElement>('[data-media-file]');
  if (!signUrl || !publicUrl || !fileInput) return null;

  // Las credenciales viven en el endpoint de firma, nunca en el paquete que llega al
  // navegador: el proveedor solo conoce la URL a la que pedir una subida firmada.
  const provider = createS3CompatibleProvider({
    publicUrlBase: publicUrl,
    async getUploadUrl(file, options) {
      const response = await fetch(signUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: options?.contentType ?? file.type,
          size: file.size,
        }),
      });
      if (!response.ok) throw new Error('No se pudo firmar la subida');
      return response.json();
    },
  });

  const store = createMediaPickerStore();
  const status = root.querySelector<HTMLElement>('[data-media-status]');

  const unsubscribe = store.subscribe((state) => {
    if (!status) return;
    status.textContent = state.error ? state.error.message : state.status;
    status.dataset.status = state.status;
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    store.loadLocalFile(file);
    await store.upload(provider);
  });

  // Astro sustituye el documento entero en cada navegación con View Transitions, así que el
  // store se destruye antes de que la página desaparezca para no dejar oyentes vivos.
  document.addEventListener(
    'astro:before-swap',
    () => {
      unsubscribe();
      store.destroy();
    },
    { once: true },
  );

  return store;
}

export function mountMediaPickers(): void {
  document.querySelectorAll<HTMLElement>('[data-media-picker]').forEach(mountMediaPicker);
}
