# @modularcore/media-picker

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
