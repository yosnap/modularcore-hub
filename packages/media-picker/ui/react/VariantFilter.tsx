import type { JSX } from 'react';

/** Valor con el que `ListOptions.variant` pide los originales que no tienen ninguna derivada. */
export const NO_VARIANTS = 'none';

export interface VariantFilterProps {
  /** Etiquetas ofrecidas, p. ej. `['large', 'medium', 'thumb']` — las decide quien llama. */
  options: string[];
  /** Etiqueta activa, `'none'`, o `undefined` para no filtrar. */
  selected?: string | undefined;
  /** Recibe `undefined` cuando se vuelve a «todos», para omitir `variant` de `ListOptions`. */
  onChange: (variant: string | undefined) => void;
}

/**
 * Selector de tamaño derivado para la biblioteca. Alimenta `ListOptions.variant`, que el núcleo
 * reenvía tal cual al hook `list` del proveedor.
 *
 * Es selección única, no casillas como `MimeTypeFilter`: filtrar por dos tamaños a la vez no
 * significa nada —cada objeto se muestra una sola vez, con sus derivadas dentro—, y `'none'` es
 * excluyente con cualquier etiqueta por definición.
 *
 * Deliberadamente sin estilos, como el resto de la UI de referencia.
 */
export function VariantFilter({ options, selected, onChange }: VariantFilterProps): JSX.Element {
  return (
    <label>
      Size
      <select
        value={selected ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">All sizes</option>
        {options.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
        <option value={NO_VARIANTS}>Without derived sizes</option>
      </select>
    </label>
  );
}
