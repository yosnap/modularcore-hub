# @modularcore/ai-chat

## 0.2.1

### Patch Changes

- 93ce5bc: Traducir al español la descripción del componente y sus variables de entorno en el catálogo. El
  componente en sí es headless y no tiene UI propia, así que no había más texto que traducir.

## 0.2.0

### Minor Changes

- 49069f2: Add Vue and Angular headless adapters, Azure Blob SAS uploads, and Laravel/Blade integration snippets.
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

- 8f14656: Unificar `vanilla` como el valor con el que el registry nombra a un proyecto sin framework, y
  enseñárselo a la CLI.

  El eje de framework vive en tres sitios y hasta ahora sólo el descriptor lo conocía: `frameworks`
  acepta texto libre, así que `media-picker` pudo declarar `vanilla` y `ai-chat` `web` para la misma
  idea, mientras la CLI mantenía una lista cerrada de cinco valores que no incluía ninguno de los
  dos. El resultado era que la etiqueta no la consumía nadie: en un proyecto Astro, `init` obligaba a
  elegir de una lista sin la opción correcta y el binding sin framework no había forma de instalarlo.

  - `framework-detect`: `vanilla` se suma a `DetectedFramework` y se deduce de `astro` en las
    dependencias. No se deduce de la ausencia de marcadores —un proyecto que aún no ha instalado su
    framework es desconocido, no carece de él—, así que ese caso sigue preguntando, como manda AD2.
    Un Astro con islas de React declara ambos y también pregunta: elegir entre la isla y el script
    plano es del proyecto.
  - `init`: `vanilla` entra en las opciones del prompt y en `DEFAULT_PATHS`.
  - `ai-chat`: el descriptor pasa de declarar `web` a `vanilla`. El directorio `adapters/web` no se
    toca; sólo cambia el nombre del eje.

  `assertCompatible` ya se comportaba bien para este caso —descarta los peers de los frameworks que
  no son el del proyecto—, y ahora hay pruebas que lo fijan.

## 0.1.1

### Patch Changes

- b53818b: AI Chat headless core: OpenAI-compatible client (BYOK, OpenRouter default), cancelable SSE
  streaming, model fallback, heuristic token estimation, schema-validated tool dispatch with
  human-in-the-loop confirmation, local and backend-contract-validated chat history, React,
  Svelte and vanilla Web adapters. Retroactive changeset for Fase 5 (v0.5.0), which shipped
  without one — see `docs/branching-release-strategy.md`.
