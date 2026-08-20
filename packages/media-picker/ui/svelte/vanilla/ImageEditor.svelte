<script lang="ts">
  import '../../vanilla-styles.css';
  import type { MediaPickerRune } from '../../../adapters/svelte/create-media-picker.svelte.js';
  import type { AspectRatio, CropRect } from '../../../core/canvas/crop.js';

  let { picker }: { picker: MediaPickerRune } = $props();

  const aspectPresets: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

  let aspect = $state<AspectRatio>('free');
  let zoom = $state(1);
  let rect = $state({ x: 0, y: 0, width: 100, height: 100 });

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
        rect = { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
        bitmap.close();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  });

  /** Same zoom math as the headless variant — must stay identical across variants. */
  function applyZoom(source: CropRect, factor: number): CropRect {
    const width = source.width / factor;
    const height = source.height / factor;
    return {
      x: source.x + (source.width - width) / 2,
      y: source.y + (source.height - height) / 2,
      width,
      height,
    };
  }

  function applyCrop(): void {
    void picker.crop({ rect: applyZoom(rect, zoom), aspect });
  }
</script>

<div class="mc-editor">
  <div class="mc-editor__controls">
    {#each aspectPresets as preset (preset)}
      <label>
        <input type="radio" name="mc-aspect" checked={aspect === preset} onchange={() => (aspect = preset)} />
        {preset}
      </label>
    {/each}
  </div>
  <div class="mc-editor__actions">
    <button type="button" onclick={() => picker.rotate('ccw')} class="mc-button">Rotate left</button>
    <button type="button" onclick={() => picker.rotate('cw')} class="mc-button">Rotate right</button>
    <button type="button" onclick={() => picker.flip('horizontal')} class="mc-button">Flip horizontal</button>
    <button type="button" onclick={() => picker.flip('vertical')} class="mc-button">Flip vertical</button>
  </div>
  <label>
    Zoom
    <input type="range" min="1" max="4" step="0.1" bind:value={zoom} />
  </label>
  <button type="button" onclick={applyCrop} disabled={picker.state.status !== 'idle'} class="mc-button">Apply crop</button>
  {#if picker.state.error}
    <p role="alert" class="mc-alert">{picker.state.error.message}</p>
  {/if}
  {#if previewUrl}
    <div class="mc-editor__preview">
      <img src={previewUrl} alt="Editor preview" style="transform:scale({zoom});transform-origin:center" />
    </div>
  {/if}
</div>
