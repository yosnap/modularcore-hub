---
'@modularcore/media-picker': patch
---

Corregir tres fallos en la generación de tamaños y en el montaje sin framework, detectados al
revisar el código ya integrado.

- `uploadWithVariants` reenviaba a cada derivada las opciones de la subida original. `key` y
  `overwriteKey` significan «escribe exactamente en esta clave», así que cada tamaño se escribía
  encima del original: el «original» acababa siendo la miniatura de 400 px y, como la clave
  devuelta seguía apuntando ahí, no se veía ningún error. `contentType` tenía el mismo problema en
  menor grado: una derivada convertida a JPEG se almacenaba y se servía como el tipo del original.
  Ahora esas tres opciones se omiten y cada derivada anuncia el tipo real de su blob.
- `generateVariants` daba por hecho que el formato pedido siempre venía informado; sin él, un
  original JPEG salía como PNG y la miniatura pesaba más que la imagen de la que venía.
- El snippet de Astro se montaba una sola vez y no se limpiaba entre navegaciones con View
  Transitions, de modo que al volver a una página el picker quedaba muerto. Ahora monta en
  `astro:page-load`, se da de baja en `astro:before-swap` y no deja el `<input type="file">` con el
  fichero anterior seleccionado.
