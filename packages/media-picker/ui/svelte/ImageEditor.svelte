<script lang="ts">
  import type { MediaPickerRune } from '../../adapters/svelte/create-media-picker.svelte.js';
  import type { AspectRatio, CropRect } from '../../core/canvas/crop.js';

  let { picker }: { picker: MediaPickerRune } = $props();

  const aspectPresets: AspectRatio[] = ['free', '1:1', '16:9', '4:3', '3:2'];

  let aspect = $state<AspectRatio>('free');
  let zoom = $state(1);
  let rect = $state({ x: 0, y: 0, width: 100, height: 100 });

  // Blob URLs are process-wide handles the browser won't reclaim on its own; without this
  // effect a new one was minted on every reactive update (every keystroke, every zoom tick)
  // and never revoked, leaking one object URL per interaction for the life of the tab.
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

  /** Zoom narrows the crop rect toward its own center (zoom 2 = crop the middle half); it
   * never touches image pixels directly — this is the only place that translates the zoom
   * slider into the rect actually sent to `picker.crop()`, so the preview's `scale()`
   * transform and the applied crop always agree on what "zoomed in" means. */
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

<div>
  <div>
    <button type="button" onclick={() => picker.rotate('ccw')}>Rotate left</button>
    <button type="button" onclick={() => picker.rotate('cw')}>Rotate right</button>
    <button type="button" onclick={() => picker.flip('horizontal')}>Flip horizontal</button>
    <button type="button" onclick={() => picker.flip('vertical')}>Flip vertical</button>
  </div>
  <div>
    <label>
      Aspect ratio
      <select bind:value={aspect}>
        {#each aspectPresets as preset (preset)}
          <option value={preset}>{preset}</option>
        {/each}
      </select>
    </label>
    <label>
      Zoom
      <input type="range" min="1" max="4" step="0.1" bind:value={zoom} />
    </label>
    <label>
      Width
      <input type="number" bind:value={rect.width} />
    </label>
    <label>
      Height
      <input type="number" bind:value={rect.height} />
    </label>
    <button type="button" onclick={applyCrop} disabled={picker.state.status !== 'idle'}>Apply crop</button>
  </div>
  {#if picker.state.error}
    <p role="alert">{picker.state.error.message}</p>
  {/if}
  {#if previewUrl}
    <!--
      overflow:hidden here is containment, not styling — without it a zoomed-in transform:scale()
      preview visually spills past its own box (transforms don't reserve layout space) and
      overlaps whatever renders after this component.
    -->
    <div style="overflow:hidden;max-width:100%;max-height:70vh">
      <img
        src={previewUrl}
        alt="Editor preview"
        style="transform:scale({zoom});transform-origin:center;max-width:100%;display:block"
      />
    </div>
  {/if}
</div>
