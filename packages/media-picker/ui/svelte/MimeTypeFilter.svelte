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

<div role="group" aria-label="Filter by file type">
  {#each options as mimeType (mimeType)}
    <label style="margin-right:8px">
      <input type="checkbox" checked={selected.includes(mimeType)} onchange={() => toggle(mimeType)} />
      {mimeType}
    </label>
  {/each}
</div>
