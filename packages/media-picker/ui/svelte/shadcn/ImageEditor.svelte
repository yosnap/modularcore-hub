<script lang="ts">
  import { Dialog, Slider } from 'bits-ui';

  import '../../shadcn-theme.css';
  import { applyZoom } from '../../../core/canvas/zoom.js';
  import { resizeCropRect } from '../../../core/canvas/crop.js';

  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { AspectRatio, CropHandle, CropRect } from '../../../core/canvas/crop.js';
  import type { StorageProvider } from '../../../core/provider.js';

  /**
   * "Editar imagen" modal (shadcn variant — uses `bits-ui`'s `Dialog`/`Slider` primitives, same
   * as this variant's `MediaLibraryModal`): image + interactive crop handles (left), a
   * "Metadatos" panel (right), proportion/rotate/zoom controls, and a
   * Cancelar/Sobreescribir/Guardar como nuevo footer.
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
  const isBusy = $derived(submitting || picker.state.status === 'uploading');

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

  function handleOpenChange(next: boolean): void {
    if (!next) onClose();
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
    <Dialog.Content
      class="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
    >
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <Dialog.Title class="text-base font-semibold text-foreground">Editar imagen</Dialog.Title>
        <Dialog.Close aria-label="Cerrar" class="rounded-md p-1 text-muted-foreground hover:bg-accent">✕</Dialog.Close>
      </div>

      <div class="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div class="flex flex-col gap-3">
          <div
            bind:this={containerEl}
            class="relative max-h-[50vh] max-w-full overflow-hidden rounded-md border border-border bg-muted"
          >
            {#if previewUrl}
              <img
                src={previewUrl}
                alt="Editor preview"
                style="transform:scale({zoom});transform-origin:center"
                class="block h-auto w-full"
              />
            {/if}
            <div style={overlayStyle} class="border-2 border-dashed border-background shadow-[0_0_0_1px_rgba(0,0,0,0.4)]">
              {#each HANDLES as handle (handle)}
                <div
                  role="button"
                  tabindex="0"
                  aria-label={`Redimensionar recorte — ${HANDLE_LABEL[handle]}`}
                  data-handle={handle}
                  style="position:absolute;width:12px;height:12px;{HANDLE_POSITION[handle]}"
                  class="rounded-full border border-primary bg-background shadow"
                  onpointerdown={(event) => handlePointerDown(handle, event)}
                  onpointermove={handlePointerMove}
                  onpointerup={handlePointerUp}
                  onpointercancel={handlePointerUp}
                ></div>
              {/each}
            </div>
          </div>

          {#if picker.state.error}
            <p role="alert" class="text-sm text-destructive">{picker.state.error.message}</p>
          {/if}

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium text-muted-foreground">Proporción</span>
            {#each aspectPresets as preset (preset)}
              <button
                type="button"
                aria-pressed={aspect === preset}
                onclick={() => selectPreset(preset)}
                class="rounded-full border px-3 py-1 text-xs {aspect === preset ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:bg-accent'}"
              >
                {preset}
              </button>
            {/each}
            <label class="flex items-center gap-1 text-xs text-muted-foreground">
              W
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customWidth ?? ''}
                oninput={(event) => setCustomWidth(Number(event.currentTarget.value))}
                class="w-16 rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
              />
            </label>
            <label class="flex items-center gap-1 text-xs text-muted-foreground">
              H
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customHeight ?? ''}
                oninput={(event) => setCustomHeight(Number(event.currentTarget.value))}
                class="w-16 rounded-md border border-input bg-background px-2 py-1 disabled:opacity-50"
              />
            </label>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick={() => picker.rotate('ccw')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⟲ -90°</button>
            <button type="button" onclick={() => picker.rotate('cw')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⟳ +90°</button>
            <button type="button" onclick={() => picker.flip('horizontal')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⇋ Voltear H</button>
            <button type="button" onclick={() => picker.flip('vertical')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⇅ Voltear V</button>
          </div>

          <label class="flex flex-col gap-2 text-sm text-foreground">
            ZOOM — {zoom.toFixed(1)}×
            <Slider.Root type="single" bind:value={zoom} min={1} max={4} step={0.1} class="relative flex h-5 w-full touch-none items-center">
              <span class="relative h-1.5 w-full grow rounded-full bg-secondary">
                <Slider.Range class="absolute h-full rounded-full bg-primary" />
              </span>
              <Slider.Thumb index={0} class="block h-4 w-4 rounded-full border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </Slider.Root>
          </label>
        </div>

        <div class="flex flex-col gap-3 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          <h3 class="text-sm font-semibold text-foreground">Metadatos</h3>
          <label class="flex flex-col gap-1 text-xs text-muted-foreground">
            Nombre del archivo <span class="rounded bg-secondary px-1 py-0.5 text-[10px] text-secondary-foreground">editable</span>
            <input type="text" bind:value={metaFileName} class="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-muted-foreground">
            Texto alternativo (ALT)
            <input type="text" bind:value={metaAlt} class="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-muted-foreground">
            Título
            <input type="text" bind:value={metaTitle} class="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <label class="flex flex-col gap-1 text-xs text-muted-foreground">
            Descripción
            <textarea bind:value={metaDescription} rows="3" class="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"></textarea>
          </label>
          <button type="button" onclick={handleSaveMetadata} class="w-fit rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
            Guardar metadatos
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        <button type="button" onclick={handleCancel} class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">
          Cancelar
        </button>
        <button
          type="button"
          onclick={handleOverwrite}
          disabled={!sourceKey || !provider || isBusy}
          class="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
        >
          Sobreescribir
        </button>
        <button
          type="button"
          onclick={handleSaveAsNew}
          disabled={!provider || isBusy}
          class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Guardar como nuevo
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
