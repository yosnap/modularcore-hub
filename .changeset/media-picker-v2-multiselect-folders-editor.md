---
"@modularcore/media-picker": minor
---

Media Picker v2: multiselection (accumulated selection with an optional `maxSelection`
cap), a flat folder model (`listFolders`/`createFolder` provider hooks), cursor-based
paginated/mimeType-filterable listing, and an image editor pipeline (rotate 90°/flip,
crop aspect-ratio presets) on top of the existing crop/compress canvas pipeline. Adds
minimal unstyled reference UI components for React and Svelte.

**Breaking**: `StorageProvider.list(prefix?)` is now `list(options?: ListOptions):
Promise<ListPage>` — implementations returning a bare array must wrap it as
`{ items: [...] }`.
