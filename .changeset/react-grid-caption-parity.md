---
'@modularcore/media-picker': minor
'@modularcore/registry': patch
---

Alinear los `MediaLibraryGrid` de React con el rediseño que sólo había alcanzado a Svelte.

Las cuatro presentaciones de React pintaban la miniatura y nada más. Ahora llevan el mismo pie que
las de Svelte —nombre de fichero truncado con la clave completa en el `title`, tamaño legible y un
distintivo por cada tamaño derivado—, usando `formatBytes`, `sortVariants` y `formatVariantBadge`
de `core/format.ts` para que las ocho rendericen exactamente lo mismo.

`basename` sube también a `core/format.ts`: estaba copiado en las cuatro presentaciones de Svelte y
ahora hay una sola definición.

Aparte, se repara la página de documentación de `media-picker`, publicada con un conflicto de merge
entero dentro. Nada lo detectaba: el markdown con marcadores sigue siendo válido, `*.md` está en
`.prettierignore` y ningún test leía ese fichero. La prueba nueva de `registry` recorre el árbol de
fuentes y falla ante cualquier marcador sin resolver.
