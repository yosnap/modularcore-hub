---
'@modularcore/media-picker': minor
---

Hacer coherente el contrato de los tamaños derivados, en sus tres puntos rotos.

- **Las medidas de cada derivada llegan al proveedor.** `generateVariants` las calculaba y
  `uploadWithVariants` las tiraba, así que un proveedor no tenía de dónde sacarlas y
  `ListedObject.variants` volvía siempre sin `width`. Consecuencia: `formatVariantBadge` existe
  para mostrar el ancho en píxeles y **no podía mostrarlo nunca** — las ocho presentaciones caían
  siempre en la etiqueta, que era el respaldo. `UploadOptions` gana `variantWidth`/`variantHeight`,
  y `ObjectVariant` gana `mimeType`, porque una derivada puede recodificarse.
- **Un `reset()` detiene las derivadas pendientes.** El bucle de subida quedaba fuera del
  mecanismo de generación que protege al resto del núcleo: tras cargar otra imagen, las derivadas
  de la anterior seguían subiéndose contra su clave, sin nada que las observara ni las parase, y
  con el estado diciendo `done` desde que terminó el original.
- **`selectionAtVariant` devuelve la derivada entera**, clave incluida. Antes dejaba la clave y el
  formato del original junto a la URL de la miniatura: quien guardase la pareja registraba dos
  cosas distintas, y un `provider.remove(item.key)` borraba el original creyendo borrar la
  miniatura. El objeto resultante ya no lleva `variants` —una derivada no tiene derivadas—; para
  saltar a otro tamaño se parte de `confirmSelection()` sin transformar.
