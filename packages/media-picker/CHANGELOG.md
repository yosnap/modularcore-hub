# @modularcore/media-picker

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
