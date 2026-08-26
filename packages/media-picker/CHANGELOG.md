# @modularcore/media-picker

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
