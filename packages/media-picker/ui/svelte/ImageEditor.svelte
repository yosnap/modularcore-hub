<script lang="ts">
  import { applyZoom } from '../../core/canvas/zoom.js';
  import { resizeCropRect } from '../../core/canvas/crop.js';

  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';
  import type { AspectRatio, CropHandle, CropRect } from '../../core/canvas/crop.js';
  import type { StorageProvider } from '../../core/provider.js';

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

  // Presets and the custom W:H pair are mutually exclusive — both ultimately feed the same
  // numeric `aspect` value `resizeCropRect`/`applyCrop` already accept.
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

  // --- Metadatos panel: local UI-only state, no persistence (see header comment) --------------
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

  // --- Preview + rect init (unchanged math from the pre-modal version) ------------------------
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

  // --- Interactive crop handles: pointer wiring only, all resize math lives in
  // core/canvas/crop.js's resizeCropRect (Requirements/Architecture) ---------------------------
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

  // --- Footer: Cancelar / Sobreescribir / Guardar como nuevo -----------------------------------
  // `submitting` (local) + `picker.state.status === 'uploading'` together are the double-submit
  // guard (Red Team Finding, Critical): `submitting` covers the crop-then-upload window before
  // `state.status` itself flips to 'uploading', so a rapid second click during the crop phase
  // can't slip through either.
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

  // --- Modal shell: focus trap + Escape + backdrop click (same pattern as MediaLibraryModal,
  // Phase 2) — do not build a second one. -----------------------------------------------------
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
  <div role="presentation" onclick={onClose}>
    <div
      bind:this={dialogEl}
      role="dialog"
      aria-modal="true"
      aria-label="Editar imagen"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={handleKeydown}
    >
      <div>
        <h2>Editar imagen</h2>
        <button type="button" onclick={onClose} aria-label="Cerrar">✕</button>
      </div>

      <div>
        <div>
          <!--
            overflow:hidden here is containment, not styling — without it a zoomed-in
            transform:scale() preview visually spills past its own box.
          -->
          <div bind:this={containerEl} style="position:relative;overflow:hidden;max-width:100%;max-height:70vh">
            {#if previewUrl}
              <img
                src={previewUrl}
                alt="Editor preview"
                style="transform:scale({zoom});transform-origin:center;width:100%;height:auto;display:block"
              />
            {/if}
            <div style={overlayStyle}>
              {#each HANDLES as handle (handle)}
                <div
                  role="button"
                  tabindex="0"
                  aria-label={`Redimensionar recorte — ${HANDLE_LABEL[handle]}`}
                  data-handle={handle}
                  style="position:absolute;width:12px;height:12px;{HANDLE_POSITION[handle]}"
                  onpointerdown={(event) => handlePointerDown(handle, event)}
                  onpointermove={handlePointerMove}
                  onpointerup={handlePointerUp}
                  onpointercancel={handlePointerUp}
                ></div>
              {/each}
            </div>
          </div>

          {#if picker.state.error}
            <p role="alert">{picker.state.error.message}</p>
          {/if}

          <div>
            <span>Proporción</span>
            {#each aspectPresets as preset (preset)}
              <button type="button" aria-pressed={aspect === preset} onclick={() => selectPreset(preset)}>
                {preset}
              </button>
            {/each}
            <label>
              W
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customWidth ?? ''}
                oninput={(event) => setCustomWidth(Number(event.currentTarget.value))}
              />
            </label>
            <label>
              H
              <input
                type="number"
                min="1"
                disabled={aspect !== 'free'}
                value={customHeight ?? ''}
                oninput={(event) => setCustomHeight(Number(event.currentTarget.value))}
              />
            </label>
          </div>

          <div>
            <button type="button" onclick={() => picker.rotate('ccw')}>⟲ -90°</button>
            <button type="button" onclick={() => picker.rotate('cw')}>⟳ +90°</button>
            <button type="button" onclick={() => picker.flip('horizontal')}>Voltear H</button>
            <button type="button" onclick={() => picker.flip('vertical')}>Voltear V</button>
          </div>

          <label>
            ZOOM — {zoom.toFixed(1)}×
            <input type="range" min="1" max="4" step="0.1" bind:value={zoom} />
          </label>
        </div>

        <div>
          <h3>Metadatos</h3>
          <label>
            Nombre del archivo <span>(editable)</span>
            <input type="text" bind:value={metaFileName} />
          </label>
          <label>
            Texto alternativo (ALT)
            <input type="text" bind:value={metaAlt} />
          </label>
          <label>
            Título
            <input type="text" bind:value={metaTitle} />
          </label>
          <label>
            Descripción
            <textarea bind:value={metaDescription}></textarea>
          </label>
          <button type="button" onclick={handleSaveMetadata}>Guardar metadatos</button>
        </div>
      </div>

      <div>
        <button type="button" onclick={handleCancel}>Cancelar</button>
        <button type="button" onclick={handleOverwrite} disabled={!sourceKey || !provider || isBusy}>
          Sobreescribir
        </button>
        <button type="button" onclick={handleSaveAsNew} disabled={!provider || isBusy}>
          Guardar como nuevo
        </button>
      </div>
    </div>
  </div>
{/if}
