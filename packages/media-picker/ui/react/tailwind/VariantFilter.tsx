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

/** Variante Tailwind: mismas props y comportamiento que el VariantFilter headless. Selección única: filtrar por dos tamaños a la vez no significa nada, porque cada objeto
 * se muestra una sola vez con sus derivadas dentro. Alimenta `ListOptions.variant`. */
export function VariantFilter({ options, selected, onChange }: VariantFilterProps): JSX.Element {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
      Tamaño
      <select
        value={selected ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
      >
        <option value="">Todos los tamaños</option>
        {options.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
        <option value={NO_VARIANTS}>Sin tamaños derivados</option>
      </select>
    </label>
  );
}
