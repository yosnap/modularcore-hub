---
title: "Media Picker Style Variants"
description: "Agrega 3 variantes de presentación descargables (Tailwind, Shadcn+Radix, CSS vanilla) al Media Picker, con selector en vivo en el playground"
status: completed
priority: P2
effort: "~3-4d"
tags: [media-picker, ui, styling, registry, playground]
created: 2026-08-20
---

# Media Picker Style Variants

## Overview

El paquete `@modularcore/media-picker` ships sus componentes UI (React y Svelte) **deliberadamente sin estilos** — decisión explícita de la Fase 1 MVP (non-goal: "UI estilizada", "export shadcn"; ver `plans/260818-1856-modularcore-hub-mvp-fase-1/plan.md`). Ese non-goal ya cumplió su función (validar el core headless) y ahora se revierte parcialmente: se agregan **3 variantes de presentación** listas para copiar, sin tocar la lógica de negocio (`core/`, `adapters/`).

**Desambiguación de término:** el PRD (`modularcore-hub.md`) menciona "export shadcn-compatible" refiriéndose a un formato de **schema de registry** interoperable con `npx shadcn add` (Fase 2 del PRD, no implementada aún). Esta fase es distinta: "Shadcn" aquí significa **estilo visual** (clases Tailwind + tokens de tema + primitivas Radix/bits-ui), no el formato de registry. No se solapan.

**Variantes:**
1. **Tailwind** — utility classes puras, sin dependencias de accesibilidad adicionales.
2. **Shadcn** — tema visual Shadcn/ui completo, con primitivas de accesibilidad reales: `@radix-ui/react-*` en React, `bits-ui` (el motor de shadcn-svelte) en Svelte.
3. **Vanilla** — CSS plano sin ningún framework, bundler-agnóstico (Webpack/Vite/sin bundler).

La variante actual sin estilos **se mantiene intacta** (`ui/react/*.tsx`, `ui/svelte/*.svelte`) por compatibilidad hacia atrás — es la 4ª opción implícita ("headless/unstyled").

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Triplicar los 6 componentes UI (React + Svelte) en 3 variantes de estilo autocontenidas | P1 |
| 2 | El playground de media-picker permite alternar entre variantes con preview en vivo | P1 |
| 3 | El registry (`modularcore.json` + tarball) incluye las 3 variantes en la descarga | P2 |
| 4 | Cero cambios de comportamiento/lógica — solo JSX/markup/CSS cambia | P1 |

## Non-Goals

- Adaptadores Vue/Angular con estilos (fuera de alcance del monorepo, ya excluido en Fase 1).
- Descarga **selectiva** por variante vía CLI/registry (`modularcore add media-picker --style=shadcn`) — el tarball incluye las 3 variantes juntas; filtrado selectivo se evalúa en una fase futura si hay demanda real (YAGNI).
- Preview en vivo de las variantes **React** dentro del playground (que es una app SvelteKit) — solo se previsualizan en vivo las variantes **Svelte**, que es lo que el playground ya renderiza hoy. Las variantes React se entregan como código fuente verificado por typecheck/build, no renderizado en runtime del playground.
- Publicar un tema Shadcn "de marca" propio — se usa el tema Shadcn por defecto (zinc/slate neutral) tal como en un `npx shadcn init` estándar.
- **Migrar el CSS existente del resto del sitio a Tailwind** (catálogo, docs, otros playgrounds como `ai-chat`) — Tailwind se instala y se habilita globalmente (ver Validation Log, Sesión 1), pero re-estilizar componentes ya existentes que usan `<style>` plano es trabajo futuro opcional, fuera de esta fase (YAGNI: no se toca lo que no se pidió).

## Assumptions (decisiones tomadas en modo `--fast`, sin interview adicional)

Documentadas aquí para que `validate`/revisión humana pueda objetar si alguna no aplica:

1. **Empaquetado:** las 3 variantes viven en el MISMO componente de registry `media-picker` (mismo `modularcore.json`, mismo tarball) — no se crean registry components separados (`media-picker-tailwind`, etc.). Evita triplicar `core/`+`adapters/` en 3 descargas distintas y no requiere cambios en el schema de `packages/registry` ni en el CLI thin-client (Fase 3, ya shipped). Costo: el tarball crece (~+900 líneas de componentes), aceptable para un paquete headless-first.
2. **Selector del playground:** cambia qué carpeta de componentes Svelte se importa/renderiza en vivo (`ui/svelte/{variant}/*.svelte`) y qué hoja de estilos (Tailwind/Shadcn tokens) está activa. El botón de descarga sigue apuntando al único tarball (que ya trae las 3 variantes); el texto de la página aclara "incluye las 3 variantes, elegí la carpeta que uses". Variante seleccionada por defecto: **Shadcn** (confirmado en Validation Log, Sesión 1).
3. **Shadcn en Svelte:** se usa `bits-ui` (misma librería que usa shadcn-svelte oficialmente) como equivalente Svelte de Radix, no un port ad-hoc.
4. **Alcance de Tailwind en `apps/web`:** se instala y habilita **globalmente** (import en el layout raíz), no acotado a la ruta del playground — confirmado en Validation Log, Sesión 1. No implica migrar el CSS de componentes existentes (ver Non-Goals).

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Component Variant Scaffolding](./phase-01-start.md) | Done |
| 2 | [Phase 2: Tailwind Preview Infra](./phase-02-tailwind-preview-infra.md) | Done |
| 3 | [Phase 3: Tailwind Style Variant](./phase-03-tailwind-style-variant.md) | Done |
| 4 | [Phase 4: Shadcn Style Variant](./phase-04-shadcn-style-variant.md) | Done |
| 5 | [Phase 5: Vanilla CSS Style Variant](./phase-05-vanilla-css-style-variant.md) | Done |
| 6 | [Phase 6: Registry Wiring](./phase-06-registry-wiring.md) | Done |
| 7 | [Phase 7: Playground Style Selector](./phase-07-playground-style-selector.md) | Done |

**Orden:** 1 → 2 → {3, 4, 5 en paralelo, cada una toca solo su propia carpeta `ui/{react,svelte}/{variant}/`} → 6 → 7.

## Related Existing Code (contexto, no se modifica)

- `packages/media-picker/core/*` — lógica de negocio, NO se toca.
- `packages/media-picker/adapters/{react,svelte}/*` — hooks/runes de estado, NO se tocan.
- `packages/media-picker/ui/react/*.tsx`, `packages/media-picker/ui/svelte/*.svelte` — variante headless actual, se mantiene intacta.

## Success Criteria

- [x] `packages/media-picker/ui/react/{tailwind,shadcn,vanilla}/` y `packages/media-picker/ui/svelte/{tailwind,shadcn,vanilla}/` existen con los 6 componentes cada una (36 archivos nuevos + 2 hojas CSS compartidas).
- [x] `pnpm --filter @modularcore/media-picker build && typecheck && test` verde (109→118 tests tras parametrizar `applyZoom` x4 variantes). `pnpm typecheck`/`pnpm build`/`pnpm test` a nivel monorepo también verdes (260/260 tests).
- [x] `apps/web` playground de media-picker tiene un selector de estilo funcional (Tailwind/Shadcn/Vanilla/Sin estilo) que cambia el preview en vivo — verificado manualmente en navegador (carga de imagen, editor con Slider real, subida, biblioteca con Toggle real, selección múltiple, sin errores de consola).
- [x] `modularcore.json` lista los archivos de las 3 variantes (63 archivos totales en el tarball, 38 nuevos); `pnpm --filter web build:registry` genera el tarball actualizado sin romper `apps/web/src/routes/c/[name]`.
- [x] Ningún archivo de código nuevo supera 1000 líneas.
- [x] Changeset agregado para `@modularcore/media-picker` (`.changeset/media-picker-style-variants.md`, minor bump).

### Code Review (code-reviewer subagent, 2026-08-20)
2 hallazgos reales corregidos post-implementación: (1) **Alto** — `shadcn-theme.css` (lo único que el registry copia) no incluía el bloque `@theme inline {...}`, dejando la variante Shadcn visualmente rota para cualquier consumidor externo del registry; restaurado, el archivo es ahora autocontenido. (2) **Medio** — el Overview/Implementation Steps de la Fase 4 seguían describiendo un Dialog/Tabs de Radix que nunca se implementó (decisión de scope tomada durante la implementación para preservar paridad de props, no reflejada); Fase 4 actualizada con el rationale real. Hallazgo menor (comentario de seguridad de `resolveUrl` faltante en 4 variantes de `RemoteUrlLoader`) también corregido. Detalle completo en el reporte del subagente (no persistido como archivo separado — resumen suficiente aquí).

## Validation Log

### Session 1 — 2026-08-20
**Trigger:** `/ak:plan validate` tras crear el plan en modo `--fast`.
**Questions asked:** 4

#### Verification Results
- **Tier:** Full (7 fases)
- **Claims checked:** 9 (paths, deps, schema, test files)
- **Verified:** 9 | **Failed:** 0 | **Unverified:** 0
- Verificado: `apps/web` sin `tailwindcss`/`radix`/`bits-ui` en `package.json`; `apps/web/vite.config.ts` (plugin `sveltekit()` solo, sin Tailwind); `packages/registry/src/schema.zod.ts` (`type: z.string().min(1)` — acepta `"ui"` sin cambios de schema); `packages/media-picker/test/ui/image-editor-zoom.test.ts` existe; `.changeset/` existe y está configurado; conteos de líneas de los 6 componentes React (34-157 líneas) y Svelte (26-117 líneas) confirmados.

#### Questions & Answers

1. **[Architecture]** El tarball de descarga de `media-picker` va a crecer de ~7 a ~45 archivos UI (las 3 variantes + la headless, todas juntas en un mismo componente de registry). ¿Confirmás este empaquetado único, o preferís que cada variante sea un componente de registry separado?
   - Options: Un solo tarball con las 4 (Recomendado) | 3 componentes de registry separados
   - **Answer:** Un solo tarball con las 4 (Recomendado)
   - **Rationale:** Evita triplicar `core/`+`adapters/` en el registry y no requiere tocar el schema de `packages/registry` ni el CLI thin-client (ya shipped en Fase 3 del MVP).

2. **[Architecture]** Para la variante Shadcn en Svelte, ¿confirmás `bits-ui` (librería oficial detrás de shadcn-svelte) como equivalente de Radix?
   - Options: bits-ui (Recomendado) | melt-ui
   - **Answer:** bits-ui (Recomendado)
   - **Rationale:** Mayor fidelidad al ecosistema Shadcn real, mantenimiento activo, menos código que construir sobre builders low-level.

3. **[Scope]** ¿Tailwind CSS se instala solo para la ruta del playground de media-picker, o globalmente en `apps/web`?
   - Options: Solo playground media-picker (Recomendado) | Tailwind global en todo apps/web
   - **Answer:** Tailwind global en todo apps/web
   - **Custom input:** (ninguno, opción de la lista)
   - **Rationale:** El usuario prefiere dejar el sitio listo para usar Tailwind en cualquier parte a futuro, no limitarlo a una sola ruta. **Cambia el alcance de la Fase 2** (ver Impact on Phases).

4. **[Assumptions]** ¿Qué variante debe estar seleccionada por defecto al cargar el playground?
   - Options: Sin estilo / headless (Recomendado) | Tailwind
   - **Answer:** Shadcn (respuesta "Other": "por defecto ShadCN")
   - **Rationale:** El usuario quiere que el playground luzca con el tema Shadcn desde el primer render, no arrancar en el modo headless sin estilos. **Cambia el default de la Fase 7** (ver Impact on Phases).

#### Confirmed Decisions
- Empaquetado: 1 solo tarball/componente de registry para las 4 variantes.
- Shadcn Svelte: `bits-ui`.
- Tailwind: instalación y habilitación **global** en `apps/web` (import en `+layout.svelte`/`app.html`), sin migrar CSS existente de otros componentes.
- Default del selector del playground: **Shadcn** (no headless).

#### Action Items
- [x] Actualizar Non-Goals: aclarar que Tailwind global no implica migrar CSS existente.
- [x] Actualizar Fase 2: alcance global en vez de acotado a una ruta.
- [x] Actualizar Fase 7: `styleVariant` por defecto = `'shadcn'`.

#### Impact on Phases
- Fase 2: alcance ampliado de "solo ruta playground" a "global en `apps/web`" — import en layout raíz en vez de en `+page.svelte` de media-picker.
- Fase 7: valor inicial de `styleVariant` cambia de `'headless'` a `'shadcn'`.

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01-start.md, phase-02-tailwind-preview-infra.md, phase-03-tailwind-style-variant.md, phase-04-shadcn-style-variant.md, phase-05-vanilla-css-style-variant.md, phase-06-registry-wiring.md, phase-07-playground-style-selector.md
- Decision deltas checked: 4
- Reconciled stale references: 2 (Fase 2 alcance de Tailwind, Fase 7 default del selector — ambas actualizadas tras este log)
- Unresolved contradictions: 0

<!-- slug: media-picker-style-variants -->
