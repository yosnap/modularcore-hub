<script lang="ts">
  import { applyZoom } from '../../../core/canvas/zoom.js';
  import { resizeCropRect } from '../../../core/canvas/crop.js';

  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { AspectRatio, CropHandle, CropRect } from '../../../core/canvas/crop.js';
  import type { StorageProvider } from '../../../core/provider.js';

  /**
   * "Editar imagen" modal: image + interactive crop handles (left), a "Metadatos" panel
   * (right), proportion/rotate/zoom controls, and a Cancelar/Sobreescribir/Guardar como nuevo
   * footer.
   *
   * The Metadatos panel is UI-only local `$state` — there is NO persistence here by default.
   * `onSaveMetadata` is the seam a consumer wires up to actually save alt/título/descripción
   * against their own backend; without it, "Guardar metadatos" is a no-op past updating this
   * component's own local fields.
   */

  interface MetadataDraft {
    fileName: string;
    alt: string;
    title: string;
    description: string;
  }

  const HANDLES: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const HANDLE_LABEL: Record<CropHandle, string> = {
    nw: 'esquina superior izquierda',
    n: 'borde superior',
    ne: 'esquina superior derecha',
    e: 'borde derecho',
    se: 'esquina inferior derecha',
    s: 'borde inferior',
    sw: 'esquina inferior izquierda',
    w: 'borde izquierdo',
  };
  // Functional positioning only (not visual styling) — every style variant reuses this so a
  // handle is draggable at all, regardless of how each variant paints it.
  const HANDLE_POSITION: Record<CropHandle, string> = {
    nw: 'top:0;left:0;transform:translate(-50%,-50%);cursor:nwse-resize',
    n: 'top:0;left:50%;transform:translate(-50%,-50%);cursor:ns-resize',
    ne: 'top:0;left:100%;transform:translate(-50%,-50%);cursor:nesw-resize',
    e: 'top:50%;left:100%;transform:translate(-50%,-50%);cursor:ew-resize',
    se: 'top:100%;left:100%;transform:translate(-50%,-50%);cursor:nwse-resize',
    s: 'top:100%;left:50%;transform:translate(-50%,-50%);cursor:ns-resize',
    sw: 'top:100%;left:0;transform:translate(-50%,-50%);cursor:nesw-resize',
    w: 'top:50%;left:0;transform:translate(-50%,-50%);cursor:ew-resize',
  };

  const aspectPresets: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

  let {
    picker,
    provider,
    open = true,
    onClose = () => {},
    sourceKey,
    fileName = '',
    onSaveMetadata,
    onCancel,
    onOverwrite,
    onSaveAsNew,
  }: {
    picker: MediaPickerRune;
    /** Needed to actually run Sobreescribir/Guardar como nuevo's upload. Optional so existing
     * `{ picker }`-only usage keeps compiling; both footer buttons stay disabled without it. */
    provider?: StorageProvider;
    open?: boolean;
    onClose?: () => void;
    /**
     * Storage key "Sobreescribir" targets — a distinct, non-editable value. Source it ONLY from
     * `ListedObject.key` at the moment this editor is opened from the library (e.g.
     * `sourceKey={selectedItem.key}`); omit it when opening from a fresh upload/URL load that
     * has no existing key yet. NEVER read it from, derive it from, or fall back to the editable
     * "Nombre del archivo" field below or the `fileName` prop — those are display/metadata
     * values a user can freely edit, and conflating them with the overwrite target turns a
     * cosmetic rename into a client-controlled "overwrite any object whose key I can guess"
     * primitive against a signing endpoint that trusts the client-supplied key.
     */
    sourceKey?: string;
    fileName?: string;
    onSaveMetadata?: (metadata: MetadataDraft) => void;
    onCancel?: () => void;
    onOverwrite?: () => void;
    onSaveAsNew?: () => void;
  } = $props();

  let aspect = $state<AspectRatio>('free');
  let customWidth = $state<number | null>(null);
  let customHeight = $state<number | null>(null);
  let zoom = $state(1);
  let rect = $state<CropRect>({ x: 0, y: 0, width: 100, height: 100 });
  let imageSize = $state({ width: 100, height: 100 });

  const effectiveAspect = $derived<AspectRatio>(
    aspect !== 'free' ? aspect : customWidth && customHeight ? customWidth / customHeight : 'free',
  );

  function selectPreset(preset: AspectRatio): void {
    aspect = preset;
    customWidth = null;
    customHeight = null;
  }

  function setCustomWidth(value: number): void {
    customWidth = Number.isFinite(value) && value > 0 ? value : null;
    aspect = 'free';
  }

  function setCustomHeight(value: number): void {
    customHeight = Number.isFinite(value) && value > 0 ? value : null;
    aspect = 'free';
  }

  let metaFileName = $state(fileName);
  let metaAlt = $state('');
  let metaTitle = $state('');
  let metaDescription = $state('');
  $effect(() => {
    metaFileName = fileName;
  });

  function handleSaveMetadata(): void {
    onSaveMetadata?.({
      fileName: metaFileName,
      alt: metaAlt,
      title: metaTitle,
      description: metaDescription,
    });
  }

  let previewUrl = $state<string | null>(null);
  $effect(() => {
    const blob = picker.state.blob;
    if (!blob) {
      previewUrl = null;
      return;
    }
    const url = URL.createObjectURL(blob);
    previewUrl = url;
    return () => URL.revokeObjectURL(url);
  });

  $effect(() => {
    const blob = picker.state.blob;
    if (!blob) return;
    let cancelled = false;
    createImageBitmap(blob)
      .then((bitmap) => {
        if (cancelled) return;
        imageSize = { width: bitmap.width, height: bitmap.height };
        rect = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  });

  const overlayStyle = $derived(
    imageSize.width > 0 && imageSize.height > 0
      ? `position:absolute;left:${(rect.x / imageSize.width) * 100}%;top:${(rect.y / imageSize.height) * 100}%;` +
        `width:${(rect.width / imageSize.width) * 100}%;height:${(rect.height / imageSize.height) * 100}%`
      : 'display:none',
  );

  let containerEl: HTMLDivElement | undefined = $state();
  let dragHandle: CropHandle | null = null;
  let dragStart: { clientX: number; clientY: number; rect: CropRect; scaleX: number; scaleY: number } | null =
    null;

  function handlePointerDown(handle: CropHandle, event: PointerEvent): void {
    if (!containerEl || imageSize.width === 0 || imageSize.height === 0) return;
    const box = containerEl.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragHandle = handle;
    dragStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      rect: { ...rect },
      scaleX: imageSize.width / box.width,
      scaleY: imageSize.height / box.height,
    };
    event.preventDefault();
  }

  function handlePointerMove(event: PointerEvent): void {
    if (!dragHandle || !dragStart) return;
    const dx = (event.clientX - dragStart.clientX) * dragStart.scaleX;
    const dy = (event.clientY - dragStart.clientY) * dragStart.scaleY;
    rect = resizeCropRect(dragStart.rect, dragHandle, { dx, dy }, imageSize, effectiveAspect);
  }

  function handlePointerUp(event: PointerEvent): void {
    if (!dragHandle) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    dragHandle = null;
    dragStart = null;
  }

  let submitting = $state(false);
  // Also covers 'cropping'/'compressing', not just 'uploading' (Code Review Finding, Critical):
  // rotate()/flip()/crop() all capture `state.blob` synchronously and share the same generation
  // counter (core/media-picker.ts's `run()`) — clicking Rotar then immediately Guardar before
  // rotate() resolves lets crop() start against the still-pre-rotation blob and win the race,
  // silently discarding the rotation. Disabling rotate/flip/save/overwrite for the whole
  // 'idle'-to-'idle' window (not just the final upload) closes that gap structurally.
  const isBusy = $derived(submitting || picker.state.status !== 'idle');

  async function performCrop(): Promise<void> {
    if (!picker.state.blob) return;
    await picker.crop({ rect: applyZoom(rect, zoom), aspect: effectiveAspect });
  }

  async function handleOverwrite(): Promise<void> {
    if (!sourceKey || !provider || isBusy) return;
    submitting = true;
    try {
      await performCrop();
      await picker.upload(provider, { overwriteKey: sourceKey });
      onOverwrite?.();
    } finally {
      submitting = false;
    }
  }

  async function handleSaveAsNew(): Promise<void> {
    if (!provider || isBusy) return;
    submitting = true;
    try {
      await performCrop();
      await picker.upload(provider);
      onSaveAsNew?.();
    } finally {
      submitting = false;
    }
  }

  function handleCancel(): void {
    onCancel?.();
    onClose();
  }

  let dialogEl: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (open) dialogEl?.focus();
  });

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogEl) return;
    const focusable = Array.from(
      dialogEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onclick={onClose}>
    <div
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-label="Editar imagen"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleKeydown}
      class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 class="text-base font-semibold text-zinc-900">Editar imagen</h2>
        <button type="button" onclick={onClose} aria-label="Cerrar" class="rounded-md p-1 text-zinc-500 hover:bg-zinc-100">✕</button>
      </div>

      <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div class="flex flex-col gap-3">
          <div
            bind:this={containerEl}
            class="relative max-h-[50vh] max-w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
          >
            {#if previewUrl}
              <img
                src={previewUrl}
                alt="Editor preview"
                style="transform:scale({zoom});transform-origin:center"
                class="block h-auto w-full"
              />
            {/if}
            <div style={overlayStyle} class="border-2 border-dashed border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]">
              {#each HANDLES as handle (handle)}
                <div
                  role="button"
                  tabindex="0"
                  aria-label={`Redimensionar recorte — ${HANDLE_LABEL[handle]}`}
                  data-handle={handle}
                  style="position:absolute;width:12px;height:12px;{HANDLE_POSITION[handle]}"
                  class="rounded-full border border-zinc-900 bg-white shadow"
                  onpointerdown={(event) => handlePointerDown(handle, event)}
                  onpointermove={handlePointerMove}
                  onpointerup={handlePointerUp}
                  onpointercancel={handlePointerUp}
                ></div>
              {/each}
            </div>
          </div>

          {#if picker.state.error}
            <p role="alert" class="text-sm text-red-600">{picker.state.error.message}</p>
          {/if}

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-zinc-500">Proporción</span>
            {#each aspectPresets as preset (preset)}
              <button
                type="button"
                aria-pressed={aspect === preset}
                onclick={() => selectPreset(preset)}
                class="rounded-full border px-3 py-1 text-xs {aspect === preset ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'}"
              >
                {preset}
              </button>
            {/each}
            <label class="flex items-center gap-1 text-xs text-zinc-600">
              W
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customWidth ?? ''}
                oninput={(event) => setCustomWidth(Number(event.currentTarget.value))}
                class="w-16 rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50"
              />
            </label>
            <label class="flex items-center gap-1 text-xs text-zinc-600">
              H
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customHeight ?? ''}
                oninput={(event) => setCustomHeight(Number(event.currentTarget.value))}
                class="w-16 rounded-md border border-zinc-300 px-2 py-1 disabled:opacity-50"
              />
            </label>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" disabled={isBusy} onclick={() => picker.rotate('ccw')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50">⟲ -90°</button>
            <button type="button" disabled={isBusy} onclick={() => picker.rotate('cw')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50">⟳ +90°</button>
            <button type="button" disabled={isBusy} onclick={() => picker.flip('horizontal')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50">⇋ Voltear H</button>
            <button type="button" disabled={isBusy} onclick={() => picker.flip('vertical')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50">⇅ Voltear V</button>
          </div>

          <label class="flex flex-col gap-1 text-sm text-zinc-700">
            ZOOM — {zoom.toFixed(1)}×
            <input type="range" min="1" max="4" step="0.1" bind:value={zoom} class="accent-zinc-900" />
          </label>
        </div>

        <div class="flex flex-col gap-3 border-t border-zinc-200 pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          <h3 class="text-sm font-semibold text-zinc-900">Metadatos</h3>
          <label class="flex flex-col gap-1 text-xs text-zinc-600">
            Nombre del archivo <span class="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-500">editable</span>
            <input type="text" bind:value={metaFileName} class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-600">
            Texto alternativo (ALT)
            <input type="text" bind:value={metaAlt} class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-600">
            Título
            <input type="text" bind:value={metaTitle} class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-zinc-600">
            Descripción
            <textarea bind:value={metaDescription} rows="3" class="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"></textarea>
          </label>
          <button type="button" onclick={handleSaveMetadata} class="w-fit rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
            Guardar metadatos
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
        <button type="button" onclick={handleCancel} class="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50">
          Cancelar
        </button>
        <button
          type="button"
          onclick={handleOverwrite}
          disabled={!sourceKey || !provider || isBusy}
          class="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          Sobreescribir
        </button>
        <button
          type="button"
          onclick={handleSaveAsNew}
          disabled={!provider || isBusy}
          class="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Guardar como nuevo
        </button>
      </div>
    </div>
  </div>
{/if}
