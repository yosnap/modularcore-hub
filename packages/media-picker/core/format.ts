/**
 * Funciones puras que comparten las ocho presentaciones de la UI —cuatro de React y cuatro de
 * Svelte— para que todas rindan exactamente lo mismo a partir del mismo objeto: el tamaño en
 * bytes, el nombre del fichero, y el orden, el texto y la elección de los tamaños derivados.
 *
 * Viven en `core/` y no duplicadas por presentación precisamente para eso.
 */

import type { LibraryItem } from './library-state.js';
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

/**
 * Último segmento de la clave, para el pie de la tarjeta. La clave completa se conserva en el
 * `title` del elemento, así que el pie puede quedarse con lo que distingue al fichero.
 *
 * Vivía copiada en cada presentación; aquí sólo hay una definición, y las ocho —cuatro de React,
 * cuatro de Svelte— pintan exactamente lo mismo.
 */
export function basename(key: string): string {
  return key.split('/').pop() || key;
}

/**
 * La URL del tamaño `label` de este objeto, o la del original si no existe.
 *
 * El caso típico es la portada de un post que quiere el tamaño mediano: `confirmSelection()`
 * devuelve el original con sus derivadas dentro, y esto elige entre ellas. Se resuelve aquí, en
 * una función pura, y no en `MediaPicker`: la selección no cambia según el tamaño que quiera
 * mostrarse, y un mismo objeto seleccionado puede necesitar tamaños distintos en dos sitios de
 * la misma página.
 *
 * Recurrir al original ante una etiqueta ausente es deliberado: el proveedor decide qué derivadas
 * guarda, así que pedir un tamaño que no existe es normal y debe dar una imagen, no `undefined`.
 */
export function variantUrl(item: LibraryItem, label: string): string {
  return item.variants?.find((variant) => variant.label === label)?.url ?? item.url;
}

/**
 * Aplica `variantUrl` a una selección entera, devolviendo cada objeto **medido como el tamaño
 * pedido**: junto a la URL viajan el ancho, el alto y el peso de esa derivada.
 *
 * Llevarse sólo la URL sería peor que no hacer nada: quien pinte
 * `<img src={item.url} width={item.width}>` maquetaría la miniatura en la caja de 1920 px del
 * original, y cualquier recuento de bytes leería el peso del original. Cuando el tamaño no existe
 * no se toca nada, porque entonces el objeto sigue siendo el original y sus medidas son las suyas.
 *
 * `variants` se conserva en ambos casos, para poder saltar a otro tamaño sin volver a listar.
 */
export function selectionAtVariant(items: LibraryItem[], label: string): LibraryItem[] {
  return items.map((item) => {
    const match = item.variants?.find((variant) => variant.label === label);
    if (!match) return { ...item };

    // Las medidas del original se descartan junto con su URL. Si el proveedor no informa de las
    // de la derivada, el objeto sale sin ellas: no saber el ancho es correcto, y decir 1920
    // sobre una miniatura de 400 no lo es.
    const withoutOriginalSize: LibraryItem = { ...item };
    delete withoutOriginalSize.width;
    delete withoutOriginalSize.height;

    return {
      ...withoutOriginalSize,
      url: match.url,
      size: match.size,
      ...(match.width === undefined ? {} : { width: match.width }),
      ...(match.height === undefined ? {} : { height: match.height }),
    };
  });
}
