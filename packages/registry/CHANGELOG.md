# @modularcore/registry

## 0.3.0

### Minor Changes

- Escribir en el proyecto sólo los ficheros del framework que usa, no el descriptor entero.

  Un descriptor enumera los ficheros de todos sus adaptadores porque el registry sirve un único
  catálogo para cualquier proyecto, pero `add` los escribía todos: un proyecto React se llevaba
  `adapters/vue` y `adapters/angular` con esos peers sin instalar, y el `tsc` del consumidor fallaba
  justo después de un `add` que había terminado bien. Con `vanilla` entre los frameworks asignables
  apareció el primer destino donde no existe ninguno de los cuatro peers, así que el daño pasaba a
  ser total.

  - `registry`: `selectFilesForFramework` deduce de la ruta a qué framework sirve cada fichero
    (`adapters/<framework>/`, `ui/<framework>/`, `snippets/astro` → vanilla, `snippets/laravel` →
    blade). El resto —`core/`, las hojas de estilo sueltas de `ui/`— es compartido, igual que
    cualquier ruta que no siga la convención: ante la duda, sobra un fichero antes que falte uno.
    Un proyecto Blade recibe además los ficheros `vanilla`, porque sus plantillas montan ese mismo
    código sin framework.
  - `cli`: `add` y `update` aplican el recorte. `update` lo necesita para no reintroducir lo que
    `add` dejó fuera.
  - `ai-chat`: `adapters/web` pasa a llamarse `adapters/vanilla` y el export del paquete pasa de
    `@modularcore/ai-chat/web` a `@modularcore/ai-chat/vanilla`. Con el recorte por ruta, un
    directorio llamado `web` habría dejado el binding fuera justo en el proyecto que lo necesita.

### Patch Changes

- 3dbcca3: Alinear los `MediaLibraryGrid` de React con el rediseño que sólo había alcanzado a Svelte.

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

## 0.2.0

### Minor Changes

- Publish the registry client, CLI, and MCP server as public npm packages.

## 0.1.1

### Patch Changes

- b53818b: Registry descriptor schema (zod-validated) and static build pipeline (`index.json` +
  `{name}.json` + `{name}.tar.gz`), with path-traversal clamp, atomic emission, and
  binary/utf8 encoding-mismatch detection. Retroactive changeset for Fase 2 (v0.2.0), which
  shipped without one — see `docs/branching-release-strategy.md`.
