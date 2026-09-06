# @modularcore/modals

## 0.2.1

### Patch Changes

- 02afa1b: Incluir en los descriptores los ficheros que ya existían en el paquete pero que la CLI nunca
  copiaba, de modo que el código instalado no compilaba en el proyecto de destino.

  - `media-picker`: faltaban `core/format.ts`, `core/canvas/zoom.ts`, `ui/react/ModernSelect.tsx`,
    `ui/svelte/ModernSelect.svelte`, `ui/modern-select.css` y los cuatro `MediaLibraryModal.svelte`
    (headless, tailwind, shadcn y vanilla). Trece imports quedaban sin resolver: `FolderSelect` e
    `ImageEditor` de React apuntaban a `ModernSelect`, y los `MediaLibraryGrid`/`ImageEditor` de
    Svelte a `core/format` y `core/canvas/zoom`. Como efecto secundario, el modal de biblioteca
    pasa a estar realmente disponible para quien instale el componente.
  - `modals`: faltaba `ui/safe/message.ts`, importado por `safe-render.ts` y `OverlayBody.svelte`.

- Updated dependencies [49069f2]
- Updated dependencies
- Updated dependencies [8f14656]
  - @modularcore/ai-chat@0.2.0

## 0.2.0

### Minor Changes

- 5b9c07e: Add the Modals package: a headless, unified overlay system (modal, fullscreen, top/bottom banner, slide-in, toast) with eligibility (targeting, date window, priority), client-side frequency capping, trigger scheduling, and a provider pattern (no built-in DB/backend). Ships React and Svelte 5 adapters, mobile-first and accessible.
