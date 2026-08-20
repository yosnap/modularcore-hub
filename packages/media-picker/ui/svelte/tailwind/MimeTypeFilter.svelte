<script lang="ts">
  let {
    options,
    selected,
    onChange,
  }: {
    options: string[];
    selected: string[];
    onChange: (mimeTypes: string[]) => void;
  } = $props();

  function toggle(mimeType: string): void {
    onChange(
      selected.includes(mimeType)
        ? selected.filter((existing) => existing !== mimeType)
        : [...selected, mimeType],
    );
  }
</script>

<div role="group" aria-label="Filter by file type" class="flex flex-wrap gap-2">
  {#each options as mimeType (mimeType)}
    <label class="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs">
      <input type="checkbox" checked={selected.includes(mimeType)} onchange={() => toggle(mimeType)} class="accent-zinc-900" />
      {mimeType}
    </label>
  {/each}
</div>
