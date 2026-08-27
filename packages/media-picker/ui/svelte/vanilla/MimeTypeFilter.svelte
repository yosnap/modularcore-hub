<script lang="ts">
  import '../../vanilla-styles.css';

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

<div role="group" aria-label="Filter by file type" class="mc-mime-group">
  {#each options as mimeType (mimeType)}
    <label class="mc-mime-pill">
      <input type="checkbox" checked={selected.includes(mimeType)} onchange={() => toggle(mimeType)} />
      {mimeType}
    </label>
  {/each}
</div>
