---
phase: 6
title: "UI Svelte por Overlay"
status: pending
priority: P1
effort: "1-1.5d"
dependencies: [4]
---

# Phase 6: UI Svelte por Overlay

## Overview

Equivalente Svelte 5 de la Fase 5: mismos tipos de overlay, mismo comportamiento responsive, de a11y
y de **seguridad en el render**, reutilizando las utilidades compartidas creadas en la Fase 4
(`ui/a11y/*` y `ui/safe/*`) sin modificarlas. Paralelizable con la Fase 5 (ownership disjunto:
`ui/svelte/*`; los archivos compartidos ya existen tras la Fase 4 — RT-SC5).

## Requirements

- Funcional: `ModalOverlay.svelte`, `FullscreenOverlay.svelte`, `TopBanner.svelte`,
  `BottomBanner.svelte`, `SlideIn.svelte`, `Toast.svelte`, `ModalsRenderer.svelte`.
- Funcional: props `config` + callbacks que reenvían a `dismiss(id, action)`.
- No funcional: mismo contrato de a11y, responsive y **seguridad** que la Fase 5 (su tabla + su
  sección de seguridad son la FUENTE ÚNICA — no duplicar aquí para evitar divergencia).

## Architecture

- Reusar (import, no edición): `ui/a11y/focus-trap.ts`, `ui/a11y/reduced-motion.ts`,
  `ui/safe/url.ts` (`safeHref`/`safeImageSrc`), `ui/safe/style.ts` (`safeColor`).
- `message`: por defecto texto (`{config.message}`); si `config.allowHtml` → `{@html
  renderMarkdownToHtml(config.message)}` de `@modularcore/ai-chat`, NUNCA `{@html config.message}` crudo (RT-S2).
- Enlaces con `rel="noopener noreferrer"`; `<img referrerpolicy="no-referrer" src={safeImageSrc(...)}>`.
- Estilos vía binding de atributos con valores validados (`style:background-color={safeColor(bgColor)}`),
  nunca concatenación de strings (RT-S5).
- Runes Svelte 5 (`$props`, `$effect`) para montar/limpiar focus-trap y auto-dismiss de toast
  (keyed por id, idempotente — RT-FM6).
- `ModalsRenderer.svelte`: singleton slots desde `state.active` + lista `{#each state.toasts as t (t.id)}`
  para el stack de toasts (RT-FM1).
- Diseño responsive y contrato a11y/seguridad: **idénticos a la Fase 5** (fuente de verdad).

## Data Flow

`createModals` rune → `state.active` + `state.toasts` → `<ModalsRenderer ondismiss={dismiss}>` →
componente por `type` con `config` saneado + callbacks → `dismiss(id, action)`.

## Related Code Files

- Create: `packages/modals/ui/svelte/ModalOverlay.svelte`, `FullscreenOverlay.svelte`, `TopBanner.svelte`, `BottomBanner.svelte`, `SlideIn.svelte`, `Toast.svelte`, `ModalsRenderer.svelte`
- Import (no modificar): `ui/a11y/*`, `ui/safe/*` (Fase 4); `packages/ai-chat/ui/markdown.ts`
- Reference (no modificar): `media-picker/ui/svelte/*` (patrón de estilo scoped)

## Implementation Steps

1. Componentes por tipo con runes; modal/fullscreen usan focus-trap + Escape; banners/slide-in/toast usan aria-live.
2. Render seguro: `message` texto/`allowHtml`; `safeHref`/`safeImageSrc`; `rel`/`referrerpolicy`; `safeColor`.
3. `Toast.svelte`: auto-dismiss vía `$effect` keyed por id con cleanup; `dismiss` idempotente.
4. `ModalsRenderer.svelte`: `active` (singleton) + `{#each toasts}` (stack).
5. Exports Svelte como **glob a fuente RAW** `"./ui/svelte/*": "./ui/svelte/*"` (media-picker `:77`) y
   asegurar `"ui/svelte"` en `package.json` `files` (media-picker `:79-82` — RT-A5). `ui/svelte` FUERA del tsconfig include.
6. Tests jsdom/svelte-testing con `vitest.ui.config.ts` (Fase 7).

## Success Criteria

- [x] Paridad funcional con React: mismos tipos, mismas `InteractionAction`, mismo comportamiento a11y y de seguridad.
- [x] Modal/fullscreen: focus trap + Escape + retorno de foco; toasts en stack con cap.
- [x] `{@html}` sólo tras `renderMarkdownToHtml` cuando `allowHtml`; `javascript:` url descartada; `imageUrl` no-https descartado.
- [x] Reusa `ui/a11y/*` y `ui/safe/*` sin modificarlos (verificar en diff).
- [x] `package.json` `files` incluye `ui/svelte`; exports svelte apuntan a raw (RT-A5).
- [x] Ningún componente >400 líneas.

## Risk Assessment

- **Divergencia React↔Svelte** (Media) → contrato a11y/responsive/seguridad en Fase 5 (única fuente); classNames compartidos; tests espejo; helpers `ui/safe`/`ui/a11y` compartidos.
- **`.svelte` fuera del tarball publicado** (Media, RT-A5) → `files:["dist","ui/svelte"]` + exports raw.
