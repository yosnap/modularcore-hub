---
'@modularcore/media-picker': minor
---

Completar los tamaños derivados en la UI: filtrar por tamaño y elegirlo al confirmar.

El contrato admitía ambas cosas desde la versión anterior —`ListOptions.variant` viaja hasta el
hook `list` del proveedor y `ListedObject.variants` llega con cada objeto— pero no había forma de
usarlas sin llamar al núcleo a mano.

- **`VariantFilter`**, en las ocho presentaciones. Alimenta `ListOptions.variant`. Es selección
  única, no casillas como `MimeTypeFilter`: filtrar por dos tamaños a la vez no significa nada,
  porque cada objeto aparece una sola vez con sus derivadas dentro, y `'none'` es excluyente con
  cualquier etiqueta por definición. Devuelve `undefined` al volver a «todos», para que `variant`
  se omita del listado en lugar de viajar como cadena vacía.
- **`variantUrl` y `selectionAtVariant`** en `core/format.ts`, con el nuevo export
  `@modularcore/media-picker/format`. Resuelven la URL de un tamaño concreto sobre lo que devuelve
  `confirmSelection()`, recurriendo al original cuando ese tamaño no existe: el proveedor decide
  qué derivadas guarda, así que pedir una ausente es normal y debe dar una imagen, no `undefined`.

`MediaPicker` no cambia. La selección no depende del tamaño que quieras mostrar, y un mismo objeto
seleccionado puede necesitar tamaños distintos en dos sitios de la misma página, así que resolverlo
con funciones puras encaja mejor que con un argumento en `confirmSelection()`.
