---
'@modularcore/media-picker': patch
---

Incluir `variant` en la clave de filtros de `listPage`, para que cambiar el tamaño derivado
reinicie la paginación como cualquier otro filtro.

`listPage` decide si invalidar su caché de cursores comparando una clave construida con
`folder`, `mimeTypes`, `scope`, `query` y `sort`. `variant` llegó al contrato después y no se
añadió ahí, así que elegir un tamaño desde el `VariantFilter` mientras se estaba en la página 3
dejaba la clave intacta: la caché no se invalidaba y la siguiente página se pedía con un cursor
que pertenecía al listado sin filtrar, devolviendo elementos de otro conjunto de resultados.
