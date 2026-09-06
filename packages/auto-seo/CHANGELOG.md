# @modularcore/auto-seo

## 0.2.1

### Patch Changes

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

## 0.2.0

### Minor Changes

- f239b9e: feat: wire registry-client, mcp-server and auto-seo; bump cli
