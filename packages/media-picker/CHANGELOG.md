# @modularcore/media-picker

## 0.7.1

### Patch Changes

- 93ce5bc: Traducir al español la descripción del componente y toda la interfaz visible: labels, botones,
  mensajes de estado y de error de `FolderSelect`, `BulkActionsBar`, `ImageEditor`,
  `MimeTypeFilter` y `VariantFilter` en React y Svelte, en las cuatro presentaciones
  (headless/tailwind/shadcn/vanilla). Los mensajes de excepción de los proveedores de subida (por
  ejemplo Azure Blob), que no llegan a mostrarse en ninguna pantalla, se mantienen en inglés.

## 0.7.0

### Minor Changes

- 018eb7f: Hacer coherente el contrato de los tamaños derivados, en sus tres puntos rotos.

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

### Patch Changes

- af93b27: Arreglar dos fallos del snippet de montaje de Astro.

  - **El oyente del `<input type=file>` no se retiraba.** `astro:before-swap` daba de baja el
    suscriptor y destruía el store, pero un nodo con `transition:persist` sobrevive al cambio de
    documento con su oyente puesto: al limpiarse la marca de montaje, el siguiente `astro:page-load`
    lo remontaba y añadía un **segundo** oyente. Elegir un fichero lo subía dos veces, y el primero
    seguía manejando un store ya destruido, así que su estado no se reflejaba en ninguna parte. Es
    justo la subida duplicada que la marca de montaje existe para evitar. Ahora el oyente se retira
    con un `AbortController` junto al resto de la limpieza.
  - **Fuera de Astro no montaba nunca.** La cabecera promete que el mismo fichero sirve en Blade,
    HTMX, Rails o una página suelta, pero `registerMediaPickers` sólo escuchaba `astro:page-load`,
    que no existe ahí. Quien seguía la documentación obtenía un picker mudo, sin ningún error. Ahora
    monta además cuando el documento está listo; no hay doble montaje porque cada raíz lleva su
    marca.

## 0.6.0

### Minor Changes

- 5b8cb4e: Entregar en los descriptores todo lo que el código instalado necesita para compilar. Hasta ahora
  faltaban ficheros y dependencias npm, así que la CLI escribía proyectos que no arrancaban.

  - `media-picker`: faltaban nueve ficheros (`core/format.ts`, `core/canvas/zoom.ts`, los dos
    `ModernSelect` con `ui/modern-select.css` y los cuatro `MediaLibraryModal.svelte`), lo que dejaba
    diecisiete imports sin resolver. Como efecto secundario, el modal de biblioteca pasa a estar
    disponible para quien instale el componente. También faltaban por declarar `bits-ui` —que usa el
    `ModernSelect` de Svelte en las cuatro presentaciones— y `@radix-ui/react-slider` y
    `@radix-ui/react-toggle`, que ya usaba la presentación shadcn de React.
  - `modals`: faltaba `ui/safe/message.ts` y, sobre todo, las presentaciones tailwind, shadcn y
    vanilla al completo (24 ficheros y `ui/vanilla-styles.css`). El componente documenta cuatro
    presentaciones y la CLI solo entregaba la headless.
  - `auto-seo`: faltaba declarar `schema-dts`, que importa el código entregado. Solo aporta tipos,
    pero sin él el proyecto de destino no compila y el descriptor todavía no distingue entre
    dependencias de ejecución y de desarrollo.

  Ninguna de estas dependencias se recorta por framework: la CLI filtra los ficheros que escribe,
  pero instala todas las dependencias declaradas, de modo que un proyecto React recibe también
  `bits-ui`. El descriptor no tiene hoy eje de framework para dependencias.

- e2b5336: Completar los tamaños derivados en la UI: filtrar por tamaño y elegirlo al confirmar.

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

### Patch Changes

- 0a4ce6e: Incluir `variant` en la clave de filtros de `listPage`, para que cambiar el tamaño derivado
  reinicie la paginación como cualquier otro filtro.

  `listPage` decide si invalidar su caché de cursores comparando una clave construida con
  `folder`, `mimeTypes`, `scope`, `query` y `sort`. `variant` llegó al contrato después y no se
  añadió ahí, así que elegir un tamaño desde el `VariantFilter` mientras se estaba en la página 3
  dejaba la clave intacta: la caché no se invalidaba y la siguiente página se pedía con un cursor
  que pertenecía al listado sin filtrar, devolviendo elementos de otro conjunto de resultados.

- 84e23a7: Corregir tres fallos en la generación de tamaños y en el montaje sin framework, detectados al
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

## 0.5.0

### Minor Changes

- 49069f2: Add Vue and Angular headless adapters, Azure Blob SAS uploads, and Laravel/Blade integration snippets.
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

- e7971d7: Añadir tamaños derivados (variantes) a la biblioteca de medios.

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

- 02afa1b: Incluir en los descriptores los ficheros que ya existían en el paquete pero que la CLI nunca
  copiaba, de modo que el código instalado no compilaba en el proyecto de destino.

  - `media-picker`: faltaban `core/format.ts`, `core/canvas/zoom.ts`, `ui/react/ModernSelect.tsx`,
    `ui/svelte/ModernSelect.svelte`, `ui/modern-select.css` y los cuatro `MediaLibraryModal.svelte`
    (headless, tailwind, shadcn y vanilla). Trece imports quedaban sin resolver: `FolderSelect` e
    `ImageEditor` de React apuntaban a `ModernSelect`, y los `MediaLibraryGrid`/`ImageEditor` de
    Svelte a `core/format` y `core/canvas/zoom`. Como efecto secundario, el modal de biblioteca
    pasa a estar realmente disponible para quien instale el componente.
  - `modals`: faltaba `ui/safe/message.ts`, importado por `safe-render.ts` y `OverlayBody.svelte`.

- 462c0c5: Añadir un adaptador sin framework (`adapters/vanilla`) y declarar `vanilla` entre los frameworks
  soportados del componente.

  Los adaptadores existentes traducen el estado del núcleo al sistema reactivo de su framework y se
  apoyan en su ciclo de vida para darse de baja. En una página sin framework no hay ninguno de los
  dos, así que `createMediaPickerStore` expone `subscribe` —que invoca al oyente de inmediato con el
  estado actual— y `destroy`, dejando la limpieza en manos de quien crea el store.

  Habilita Astro, cuya interactividad son `<script>` con TypeScript plano y que hasta ahora no tenía
  forma de usar el componente sin cargar React o Svelte solo para eso, y sirve igual en Blade, HTMX o
  Rails. Incluye `snippets/astro/media-picker-island.ts` como montaje de referencia, con limpieza en
  `astro:before-swap` para las View Transitions.

## 0.4.0

### Minor Changes

- Redesign the Svelte UI as a modal picker/editor across all 4 style variants (headless, tailwind, shadcn, vanilla), matching the reference design: a tabbed "Biblioteca de medios" modal (Biblioteca/Subir archivo/Desde URL) and a two-column "Editar imagen" modal with interactive crop handles and a UI-only metadata panel.

  - New `MediaLibraryModal` component with real numbered pagination, search, and sort (`listPage`, `syncLibrary`, `PageCache`), alongside the existing `listLibrary` infinite-scroll action which is unchanged.
  - New per-file upload queue for the "Subir archivo" tab that never touches the single-blob picker state machine.
  - `ImageEditor` redesigned as a modal with draggable crop handles (`resizeCropRect`), a custom W:H ratio input, a shared `applyZoom` module (Svelte variants only), and a double-submit-guarded Cancelar/Sobreescribir/Guardar como nuevo footer.
  - New `UploadOptions.overwriteKey` for a real same-key overwrite upload, honored by `s3-compatible` and the demo provider (Cloudinary is explicitly unsupported — its `getSignedParams(file)` callback has no `options` parameter).

  The React UI adapter is untouched and keeps compiling; only the Svelte UI was redesigned in this release.

- 620dffd: Add 3 downloadable style variants for every UI component (React + Svelte): Tailwind, Shadcn
  (with real `@radix-ui/react-toggle`/`@radix-ui/react-slider` in React, `bits-ui` in Svelte), and
  plain CSS ("vanilla", bundler-agnostic). New files live under `ui/{react,svelte}/{tailwind,shadcn,vanilla}/`
  alongside the existing unstyled headless components, which are unchanged. `@radix-ui/react-toggle`,
  `@radix-ui/react-slider`, and `bits-ui` are new optional peer dependencies — only required by
  consumers who use the Shadcn variant.

## 0.3.2

### Patch Changes

- 6af57aa: Fix `ImageEditor`'s crop rect defaulting to a hardcoded `{100,100}` regardless of the loaded
  image's real size — selecting an aspect ratio preset and applying it against a large photo
  silently produced a tiny sliver from the top-left corner, reading as "aspect ratio doesn't do
  anything." The rect now resets to the full decoded image dimensions whenever a new blob loads
  (React and Svelte), so the default crop is the whole image and the aspect ratio option
  reshapes that.

## 0.3.1

### Patch Changes

- 9e4d2f2: Fix two real bugs found while manually testing `RemoteUrlLoader` in a browser: `resolveUrl`
  must return an absolute URL (`fromRemoteUrl` does `new URL(url)` with no base, so a relative
  proxy path throws `TypeError: Invalid URL`) — documented and fixed in the playground wiring.
  And `ImageEditor`'s zoom preview now wraps the `<img>` in an `overflow: hidden` container so a
  `transform: scale()` preview doesn't visually spill past its box onto surrounding content
  (transforms don't reserve layout space).

## 0.3.0

### Minor Changes

- 8675fef: Add the `RemoteUrlLoader` reference UI component (React + Svelte) — a thin text-input binding
  to the existing `loadFromUrl()` core action, which previously had no matching UI piece in the
  component set. Accepts an optional `resolveUrl` prop so an app can route the fetch through a
  same-origin server proxy instead of a direct browser fetch, which is required for most
  third-party image hosts (CORS). Also extends the demo `StorageProvider` used by the website
  playground with folder support so `FolderSelect` has something real to show.

## 0.2.0

### Minor Changes

- f325f46: Media Picker v2: multiselection (accumulated selection with an optional `maxSelection`
  cap), a flat folder model (`listFolders`/`createFolder` provider hooks), cursor-based
  paginated/mimeType-filterable listing, and an image editor pipeline (rotate 90°/flip,
  crop aspect-ratio presets) on top of the existing crop/compress canvas pipeline. Adds
  minimal unstyled reference UI components for React and Svelte.

  **Breaking**: `StorageProvider.list(prefix?)` is now `list(options?: ListOptions):
Promise<ListPage>` — implementations returning a bare array must wrap it as
  `{ items: [...] }`.

### Patch Changes

- b53818b: Universal Media Picker: headless core (crop/compress via Canvas), S3-compatible and
  Cloudinary storage providers (browser never holds credentials), SSRF-guarded remote-URL
  source with DNS-rebinding-safe connection pinning, React and Svelte adapters. Retroactive
  changeset for Fase 4 (v0.4.0), which shipped without one — see
  `docs/branching-release-strategy.md`.
