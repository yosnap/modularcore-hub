# @modularcore/modals

## 0.3.1

### Patch Changes

- 93ce5bc: Traducir al español la descripción del componente en el catálogo y los dos textos que trae por
  defecto: el `aria-label` de respaldo del overlay ("Dialog" → "Diálogo") y el del botón de cerrar
  ("Close" → "Cerrar"), usados solo cuando quien consume el componente no indica los suyos propios.
- Updated dependencies [93ce5bc]
  - @modularcore/ai-chat@0.2.1

## 0.3.0

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
