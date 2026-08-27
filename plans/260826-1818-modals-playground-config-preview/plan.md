---
title: "Modals: variantes de estilo (Tailwind/Shadcn/CSS plano) + selector en playground"
description: "Igual tratamiento que Media Picker: 3 variantes con estilo para los 7 componentes de UI de modals (Svelte), más el selector de estilo y el constructor de config ya armado en el playground."
status: pending
priority: P2
effort: "1-1.5d"
tags: [playground, modals, apps-web, style-variants]
created: 2026-08-26
---

# Modals: variantes de estilo + selector en playground

## Overview

`@modularcore/modals` solo tiene la variante headless (cero CSS, por diseño — mismo patrón que
Media Picker antes de su plan de variantes). Sin una variante con estilo real no hay overlay
visualmente funcional: los `<div class="modals-top-banner">` etc. no tienen ninguna regla CSS que
los posicione (`position:fixed`), les dé fondo o z-index, así que quedan invisibles/mezclados en el
flujo normal del documento — no es un bug, es el estado esperado del headless.

Este plan replica exactamente lo hecho en `plans/260820-1836-media-picker-style-variants/`: 3
variantes descargables (Tailwind, Shadcn, CSS plano) para los 7 componentes de UI Svelte de
`modals`, y el selector "Estilo del componente" en el playground (que ya tiene, desde el plan
anterior, el constructor de `ModalConfig` + preview).

## Non-Goals

- Variantes React — el playground público es Svelte-only (igual que Media Picker); React queda
  sin redisear, solo debe seguir compilando.
- `bits-ui` u otra dependencia de primitivos — a diferencia de media-picker (Slider real para zoom,
  Toggle real), modals no tiene ningún control interactivo complejo que lo justifique; Shadcn aquí
  es "Tailwind + tokens de diseño shadcn", sin primitivos adicionales.
- Arreglar la deuda técnica ya documentada de `package.json`'s `files` (no incluye `core/`/`safe/`/
  `a11y/` pese a que los componentes Svelte los importan) — pre-existente, fuera de alcance de este
  plan salvo que el usuario lo pida explícitamente.

## Requirements

- 3 variantes nuevas en `ui/svelte/{tailwind,shadcn,vanilla}/` para los 7 componentes:
  `ModalOverlay`, `FullscreenOverlay`, `TopBanner`, `BottomBanner`, `SlideIn`, `Toast`,
  `internal/OverlayBody` (más `ModalsRenderer` por variante, que solo importa los anteriores).
- Estilos funcionales reales por variante (no solo cosmética): `position:fixed` + z-index para
  modal/fullscreen/banners/slide-in, backdrop semitransparente en modal/fullscreen, stack visual
  para toasts (`ModalsRenderer`'s `.modals-toast-stack`), animaciones de entrada respetando
  `prefers-reduced-motion` (clase `modals-no-motion` ya existe, solo hay que consumirla en CSS).
- Tailwind: clases utilitarias inline, sin CSS aparte (mismo patrón que media-picker/tailwind).
- Shadcn: mismos tokens de marca ya establecidos en `apps/web/src/app.css` (`bg-background`,
  `text-foreground`, `bg-primary`, etc. vía `@layer brand`) — reusar ese layer existente, NO crear
  un `shadcn-theme.css` propio con su propio `@layer base` que repita el bug de cascada ya
  corregido en el plan de Media Picker (`app.css`'s `@layer base, brand`).
- Vanilla: clases `mc-modals-*` + un `packages/modals/ui/vanilla-styles.css` nuevo (bundler-agnostic,
  mismo patrón que `packages/media-picker/ui/vanilla-styles.css`).
- Playground (`apps/web/src/routes/playground/modals/+page.svelte`): añadir el `<select>` "Estilo
  del componente" (headless/tailwind/shadcn/vanilla) que ya existe en el playground de Media
  Picker, cambiando dinámicamente qué `ModalsRenderer`/componentes usa el constructor+preview ya
  implementado. El estado del `modals` rune (picker) sobrevive al cambio de variante, igual que en
  Media Picker.

## Architecture

```
packages/modals/ui/svelte/
├── (headless, sin cambios)
├── tailwind/{ModalOverlay,FullscreenOverlay,TopBanner,BottomBanner,SlideIn,Toast,ModalsRenderer}.svelte
│   └── internal/OverlayBody.svelte
├── shadcn/{...mismos 7...}
│   └── (usa clases bg-background/text-foreground/bg-primary ya definidas en apps/web/src/app.css)
└── vanilla/{...mismos 7...}
    └── (clases mc-modals-*, respaldadas por ui/vanilla-styles.css nuevo)

apps/web/src/routes/playground/modals/+page.svelte
└── <select bind:value={styleVariant}> → importa dinámicamente el ModalsRenderer de esa variante
    (mismo patrón ya usado en apps/web/src/routes/playground/media-picker/+page.svelte)
```

## Related Code Files

- Create: `packages/modals/ui/svelte/tailwind/*.svelte` (7 archivos)
- Create: `packages/modals/ui/svelte/shadcn/*.svelte` (7 archivos)
- Create: `packages/modals/ui/svelte/vanilla/*.svelte` (7 archivos)
- Create: `packages/modals/ui/vanilla-styles.css`
- Modify: `apps/web/src/routes/playground/modals/+page.svelte` (selector de estilo + import dinámico)
- Modify: `packages/modals/package.json` (`exports` para las 3 nuevas rutas `ui/svelte/{tailwind,shadcn,vanilla}/*`, igual patrón que ya tiene `./ui/svelte/*`)

## Implementation Steps

1. Tailwind, Shadcn y CSS plano son independientes entre sí (mismo origen headless como referencia) — implementar en paralelo.
2. Para cada variante: portar los 6 componentes overlay + `OverlayBody` + `ModalsRenderer`, preservando toda la lógica existente (focus-trap, Escape, triggers, escape-key dedupe ya extraído a `use-escape-key.ts` — el patrón Svelte sigue duplicando el listener por archivo, no tocar eso, es deuda técnica ya documentada) y solo añadiendo `class`/`style` para el look real.
3. Añadir el `<select>` de estilo al playground, reutilizando el patrón de `apps/web/src/routes/playground/media-picker/+page.svelte`.
4. Verificar: build, typecheck, lint, prettier; svelte-check de `apps/web`.

## Success Criteria

- [ ] Los 6 tipos de overlay se ven y posicionan correctamente (banners fijos arriba/abajo, modal/fullscreen con backdrop, slide-in en su esquina, toasts apilados) en las 3 variantes con estilo.
- [ ] El selector de estilo del playground cambia entre headless/tailwind/shadcn/vanilla sin perder el estado del constructor ni de `modals.state`.
- [ ] `prefers-reduced-motion` sigue respetándose en las 3 variantes nuevas (clase `modals-no-motion` consumida en su CSS).
- [ ] `pnpm --filter @modularcore/modals build/typecheck` y `pnpm --filter web exec svelte-check` sin errores; lint y prettier limpios.
