/**
 * Human-readable byte-size formatting shared by every UI variant's `MediaLibraryGrid` (filename
 * + size caption, Phase 2) — kept as a pure `core/` function (not duplicated per-variant) so all
 * 4 Svelte/React style variants render the identical string for the same `size`.
 */

import type { ObjectVariant } from './provider.js';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/**
 * Formats `bytes` (1024-based, matching OS file managers — not SI/1000-based). Callers pass
 * `ListedObject.size`/`File.size`, both always finite and non-negative; a negative/non-finite
 * input (defensive — e.g. an upstream provider bug) renders as `'—'` rather than throwing, since
 * this only ever feeds a caption string.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  // Whole bytes never need a decimal; larger units show one decimal below 10 for readability
  // (e.g. "1.5 KB" vs "150 KB"), but only when the value actually has a fractional part —
  // otherwise "1 KB" would render as "1.0 KB".
  const decimals = exponent > 0 && value < 10 && !Number.isInteger(value) ? 1 : 0;
  return `${value.toFixed(decimals)} ${UNITS[exponent]}`;
}

/**
 * Ordena los tamaños derivados de mayor a menor para pintarlos siempre igual, sea cual sea el
 * orden en que los devuelva el proveedor. Se compara por ancho y, a falta de ancho, por peso.
 */
export function sortVariants(variants: ObjectVariant[] = []): ObjectVariant[] {
  return [...variants].sort((a, b) => (b.width ?? 0) - (a.width ?? 0) || b.size - a.size);
}

/**
 * Texto corto para el distintivo de un tamaño derivado dentro de la cuadrícula: el ancho en
 * píxeles cuando el proveedor lo conoce (`1200`), y la etiqueta en caso contrario (`thumb`),
 * que es lo único garantizado por el contrato.
 */
export function formatVariantBadge(variant: ObjectVariant): string {
  return variant.width ? String(variant.width) : variant.label;
}
