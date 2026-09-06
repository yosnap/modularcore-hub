import { getDefaultCanvasEnvironment } from './canvas-environment.js';
import { compressImage } from './compress.js';

import type { CanvasEnvironment } from './canvas-environment.js';

/**
 * Un juego de tamaños derivados de la misma imagen. Las etiquetas son libres: el núcleo nunca
 * las interpreta, solo las transporta hasta el proveedor, que decide cómo persistirlas.
 */
export interface VariantSize {
  /** Identificador del tamaño, tal y como se guardará junto al objeto (`thumb`, `large`…). */
  label: string;
  /** Tope del lado más largo en píxeles. */
  maxDimension: number;
  /** Formato de salida. Por defecto se conserva el del original. */
  mimeType?: string;
  quality?: number;
}

export interface GeneratedVariant {
  label: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface GenerateVariantsOptions {
  sizes: VariantSize[];
  /**
   * Formato de salida por defecto. Sin esto se conserva el tipo del original, que suele ser lo
   * deseable: recomprimir un PNG con transparencia a JPEG lo arruina.
   */
  mimeType?: string;
  quality?: number;
  signal?: AbortSignal;
}

/**
 * Genera los tamaños derivados de una imagen, en orden descendente y **sin escalar nunca hacia
 * arriba**: una medida mayor o igual que el lado más largo del original se omite, en lugar de
 * producir una copia borrosa —o una recodificación del mismo tamaño— más pesada que la fuente.
 * Quien resuelva `variants.find(v => v.label === 'large')` debe contemplar que no exista y usar
 * el original.
 *
 * Es una función pura sobre `compressImage`: no sube nada ni conoce el almacenamiento. Quien la
 * llama decide qué hacer con los blobs — normalmente subirlos con `variantOf`/`variantLabel`
 * (ver `UploadOptions`), que es lo que hace `MediaPicker.uploadWithVariants`.
 */
export async function generateVariants(
  source: Blob,
  options: GenerateVariantsOptions,
  env: CanvasEnvironment = getDefaultCanvasEnvironment(),
): Promise<GeneratedVariant[]> {
  const image = await env.loadImage(source);
  const longestSide = Math.max(image.width, image.height);

  const applicable = options.sizes
    .filter((size) => size.maxDimension < longestSide)
    .sort((a, b) => b.maxDimension - a.maxDimension);

  const generated: GeneratedVariant[] = [];

  for (const size of applicable) {
    options.signal?.throwIfAborted();

    // `Blob.type` es cadena vacía —no `undefined`— cuando el blob no lleva tipo, así que `??`
    // nunca llegaría al valor de reserva y `compressImage` recibiría `''`, que su propio
    // parámetro por defecto tampoco corrige y acaba emitiendo PNG: una «miniatura» sin pérdida
    // y más pesada que el JPEG original que se quería reducir.
    const mimeType = size.mimeType || options.mimeType || source.type || 'image/jpeg';
    const quality = size.quality ?? options.quality;
    const blob = await compressImage(
      source,
      {
        maxDimension: size.maxDimension,
        mimeType,
        ...(quality !== undefined ? { quality } : {}),
      },
      env,
    );

    const scale = size.maxDimension / longestSide;
    generated.push({
      label: size.label,
      blob,
      width: Math.max(1, Math.round(image.width * scale)),
      height: Math.max(1, Math.round(image.height * scale)),
    });
  }

  return generated;
}
