---
'@modularcore/media-picker': minor
'@modularcore/modals': minor
'@modularcore/auto-seo': patch
---

Entregar en los descriptores todo lo que el código instalado necesita para compilar. Hasta ahora
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
- `auto-seo`: faltaba declarar `schema-dts`, que importa el código entregado.
