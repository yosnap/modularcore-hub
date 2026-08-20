<script lang="ts">
  import { Slider } from 'bits-ui';

  import '../../shadcn-theme.css';
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

<!--
  Shadcn variant of ImageEditor. The zoom control is a real `bits-ui` Slider (`type="single"`),
  the same primitive shadcn-svelte's own generated Slider uses — not a plain `<input
  type="range">`. Requires `bits-ui` as a peer dependency.
-->
<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    {#each aspectPresets as preset (preset)}
      <button
        type="button"
        onclick={() => (aspect = preset)}
        class="rounded-full border px-3 py-1 text-xs {aspect === preset ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-foreground hover:bg-accent'}"
      >
        {preset}
      </button>
    {/each}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button type="button" onclick={() => picker.rotate('ccw')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⟲ Rotate left</button>
    <button type="button" onclick={() => picker.rotate('cw')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⟳ Rotate right</button>
    <button type="button" onclick={() => picker.flip('horizontal')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⇋ Flip H</button>
    <button type="button" onclick={() => picker.flip('vertical')} class="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">⇅ Flip V</button>
  </div>
  <label class="flex flex-col gap-2 text-sm text-foreground">
    Zoom — {zoom.toFixed(1)}×
    <Slider.Root type="single" bind:value={zoom} min={1} max={4} step={0.1} class="relative flex h-5 w-full touch-none items-center">
      <span class="relative h-1.5 w-full grow rounded-full bg-secondary">
        <Slider.Range class="absolute h-full rounded-full bg-primary" />
      </span>
      <Slider.Thumb index={0} class="block h-4 w-4 rounded-full border border-primary bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </Slider.Root>
  </label>
  <button type="button" onclick={applyCrop} disabled={picker.state.status !== 'idle'} class="w-fit rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50">
    Apply crop
  </button>
  {#if picker.state.error}
    <p role="alert" class="text-sm text-destructive">{picker.state.error.message}</p>
  {/if}
  {#if previewUrl}
    <div class="max-h-[70vh] max-w-full overflow-hidden rounded-md border border-border">
      <img src={previewUrl} alt="Editor preview" style="transform:scale({zoom});transform-origin:center" class="block max-w-full" />
    </div>
  {/if}
</div>
