<script lang="ts">
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

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    {#each aspectPresets as preset (preset)}
      <button
        type="button"
        onclick={() => (aspect = preset)}
        class="rounded-full border px-3 py-1 text-xs {aspect === preset ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'}"
      >
        {preset}
      </button>
    {/each}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button type="button" onclick={() => picker.rotate('ccw')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">⟲ Rotate left</button>
    <button type="button" onclick={() => picker.rotate('cw')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">⟳ Rotate right</button>
    <button type="button" onclick={() => picker.flip('horizontal')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">⇋ Flip H</button>
    <button type="button" onclick={() => picker.flip('vertical')} class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">⇅ Flip V</button>
  </div>
  <label class="flex flex-col gap-1 text-sm text-zinc-700">
    Zoom — {zoom.toFixed(1)}×
    <input type="range" min="1" max="4" step="0.1" bind:value={zoom} class="accent-zinc-900" />
  </label>
  <button
    type="button"
    onclick={applyCrop}
    disabled={picker.state.status !== 'idle'}
    class="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
  >
    Apply crop
  </button>
  {#if picker.state.error}
    <p role="alert" class="text-sm text-red-600">{picker.state.error.message}</p>
  {/if}
  {#if previewUrl}
    <div class="max-h-[70vh] max-w-full overflow-hidden rounded-md border border-zinc-200">
      <img src={previewUrl} alt="Editor preview" style="transform:scale({zoom});transform-origin:center" class="block max-w-full" />
    </div>
  {/if}
</div>
