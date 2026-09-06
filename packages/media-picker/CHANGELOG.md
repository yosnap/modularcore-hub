# @modularcore/media-picker

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
