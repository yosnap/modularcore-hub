---
'@modularcore/media-picker': minor
---

Añadir tamaños derivados (variantes) a la biblioteca de medios.

- `core/canvas/variants.ts`: `generateVariants` produce los tamaños a partir del blob cargado
  reutilizando `compressImage`, en orden descendente y sin escalar nunca hacia arriba — una medida
  mayor que el original se omite en lugar de generar una copia borrosa y más pesada que la fuente.
- `MediaPicker.uploadWithVariants` sube el original y luego las derivadas, que necesitan su clave
  para enlazarse. Un fallo en una derivada no tumba la operación: el original ya está guardado y
  los tamaños fallidos se devuelven en `failed`.
- Contrato: `UploadOptions.variantOf`/`variantLabel` para subir una derivada,
  `ListedObject.variants` para recibirlas junto al original —nunca como entradas propias— y
  `ListOptions.variant` para filtrar. El núcleo no persiste nada: reenvía los campos al proveedor,
  igual que hace con `scope`, `query` o `sort`, y un proveedor que los ignore sigue siendo válido.
- Las cuatro presentaciones de `MediaLibraryGrid` en Svelte pintan un distintivo por tamaño,
  usando `sortVariants` y `formatVariantBadge` compartidos desde `core/format.ts` para que las
  cuatro rendericen exactamente lo mismo.

Cierra el issue #28.
