<script module lang="ts">
  /** Valor con el que `ListOptions.variant` pide los originales que no tienen ninguna derivada. */
  export const NO_VARIANTS = 'none';
</script>

<script lang="ts">
  import '../../shadcn-theme.css';
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

  A diferencia de la versión de React, el `value` es de una sola dirección: si quien lo usa ignora
  el `onChange` —porque el listado falló, por ejemplo— el desplegable se queda mostrando la
  elección rechazada en lugar de volver a `selected`. Es el mismo comportamiento que MimeTypeFilter
  y el resto de la UI de Svelte de este paquete.
-->
<label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
  Size
  <select
    value={selected ?? ''}
    onchange={handleChange}
    class="rounded-md border border-input bg-secondary px-2 py-1 text-xs text-secondary-foreground"
  >
    <option value="">All sizes</option>
    {#each options as label (label)}
      <option value={label}>{label}</option>
    {/each}
    <option value={NO_VARIANTS}>Without derived sizes</option>
  </select>
</label>
