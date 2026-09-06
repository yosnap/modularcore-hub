<script lang="ts">
  /** Valor con el que `ListOptions.variant` pide los originales que no tienen ninguna derivada. */
  const NO_VARIANTS = 'none';

  let {
    options,
    selected,
    onChange,
  }: {
    /** Etiquetas ofrecidas, p. ej. `['large', 'medium', 'thumb']` — las decide quien llama. */
    options: string[];
    /** Etiqueta activa, `'none'`, o `undefined` para no filtrar. */
    selected?: string | undefined;
    /** Recibe `undefined` al volver a «todos», para omitir `variant` de `ListOptions`. */
    onChange: (variant: string | undefined) => void;
  } = $props();

  function handleChange(event: Event): void {
    onChange((event.currentTarget as HTMLSelectElement).value || undefined);
  }
</script>
<!--
  Selector de tamaño derivado para la biblioteca. Alimenta `ListOptions.variant`, que el núcleo
  reenvía tal cual al hook `list` del proveedor.

  Es selección única, no casillas como MimeTypeFilter: filtrar por dos tamaños a la vez no
  significa nada —cada objeto se muestra una sola vez, con sus derivadas dentro— y `'none'` es
  excluyente con cualquier etiqueta por definición.
-->
<label>
  Size
  <select value={selected ?? ''} onchange={handleChange}>
    <option value="">All sizes</option>
    {#each options as label (label)}
      <option value={label}>{label}</option>
    {/each}
    <option value={NO_VARIANTS}>Without derived sizes</option>
  </select>
</label>
