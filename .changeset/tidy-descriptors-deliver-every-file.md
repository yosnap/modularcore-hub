---
'@modularcore/media-picker': minor
'@modularcore/modals': patch
---

Incluir en los descriptores los ficheros que ya existían en el paquete pero que la CLI nunca
copiaba, de modo que el código instalado no compilaba en el proyecto de destino.

- `media-picker`: faltaban `core/format.ts`, `core/canvas/zoom.ts`, `ui/react/ModernSelect.tsx`,
  `ui/svelte/ModernSelect.svelte`, `ui/modern-select.css` y los cuatro `MediaLibraryModal.svelte`
  (headless, tailwind, shadcn y vanilla). Trece imports quedaban sin resolver: `FolderSelect` e
  `ImageEditor` de React apuntaban a `ModernSelect`, y los `MediaLibraryGrid`/`ImageEditor` de
  Svelte a `core/format` y `core/canvas/zoom`. Como efecto secundario, el modal de biblioteca
  pasa a estar realmente disponible para quien instale el componente.
- `modals`: faltaba `ui/safe/message.ts`, importado por `safe-render.ts` y `OverlayBody.svelte`.
