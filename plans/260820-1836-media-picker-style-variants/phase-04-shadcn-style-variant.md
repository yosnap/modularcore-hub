---
phase: 4
title: "Shadcn Style Variant"
status: completed
priority: P1
effort: "8h"
dependencies: [1]
---

# Phase 4: Shadcn Style Variant

## Overview

Implementa los 6 componentes con el tema visual Shadcn/ui completo, usando primitivas de accesibilidad reales: `@radix-ui/react-*` en React, `bits-ui` en Svelte (mismo motor que usa shadcn-svelte oficialmente). Paralelizable con Fases 3 y 5.

<!-- Updated post-implementation (code-reviewer finding, 2026-08-20): el Overview/Implementation
Steps originales de esta fase especificaban envolver MediaLibraryGrid en un Dialog de
Radix/bits-ui con Tabs (Biblioteca/Subir/URL) replicando el modal de la captura de referencia.
Eso NO se implementó — decisión tomada durante la implementación, no reflejada hasta ahora. Los
6 componentes de esta variante usan Toggle (MediaLibraryGrid) y Slider (ImageEditor) únicamente.
Motivo: la Fase 1 (Requirements) fija como invariante que las 3 variantes expongan EXACTAMENTE
los mismos props que el componente headless. Ninguno de los 6 componentes headless tiene props
de tipo `open`/`onOpenChange` — envolver MediaLibraryGrid en un Dialog real habría requerido
agregar esos props (rompiendo la paridad de contrato) o hardcodear el Dialog siempre abierto (sin
sentido, un Dialog sin estado de apertura no es un Dialog). El modal "Biblioteca de medios" de la
captura es responsabilidad de la app CONSUMIDORA (quien decide cuándo mostrar el picker en un
modal), no del componente en sí — ver la Fase 7 del plan, donde el playground consume
MediaLibraryGrid inline, sin modal, igual que el headless. Toggle y Slider sí se usaron porque
son sustituciones 1:1 de un `<button aria-pressed>`/`<input type="range">` existente, sin
props nuevos. -->

## Requirements

- Funcional: mismo comportamiento/props que headless. `MediaLibraryGrid` usa `Toggle`/`TogglePrimitive` de Radix/bits-ui en lugar de un `<button aria-pressed>` plano (mismo prop surface, mejor accesibilidad de foco/estado); `ImageEditor` usa `Slider` de Radix/bits-ui en lugar de `<input type="range">` (mismo prop surface).
- No funcional: nueva dependencia peer opcional — el consumidor que use ESTA variante instala `@radix-ui/react-toggle`, `@radix-ui/react-slider` (React) o `bits-ui` (Svelte). NO se agregan como `dependencies` obligatorias del paquete `media-picker` (rompería el resto de variantes) — van en `peerDependencies` opcionales, documentadas en el header de cada archivo de variante.

## Architecture

- `packages/media-picker/ui/react/shadcn/` — componentes + `packages/media-picker/ui/shadcn-theme.css` con las CSS variables del tema Shadcn por defecto (zinc) y el bloque `@theme inline {...}` que las mapea a utilities Tailwind (`bg-background`, etc.) — igual al que genera `npx shadcn init`.
- `packages/media-picker/ui/svelte/shadcn/` — mismo patrón, usando `bits-ui` (`Toggle.Root`, `Slider.Root`/`Slider.Range`/`Slider.Thumb` — API de bits-ui v2).
- `shadcn-theme.css` es compartido por React y Svelte (un solo archivo, referenciado desde ambos) para que ambas variantes se vean idénticas. Es autocontenido y pensado para copiarse/importarse directamente como el entry CSS de Tailwind del consumidor (ver comentario de cabecera del archivo sobre un caso límite de bundler donde `@theme` no se procesa si se alcanza vía un `@import` anidado en lugar de ser el propio entry).

## Related Code Files

- Create: `packages/media-picker/ui/react/shadcn/{MediaLibraryGrid,FolderSelect,MimeTypeFilter,ImageEditor,BulkActionsBar,RemoteUrlLoader}.tsx`
- Create: `packages/media-picker/ui/svelte/shadcn/{MediaLibraryGrid,FolderSelect,MimeTypeFilter,ImageEditor,BulkActionsBar,RemoteUrlLoader}.svelte`
- Create: `packages/media-picker/ui/shadcn-theme.css` (compartido, tokens de tema + mapeo `@theme`)
- Modify: `packages/media-picker/package.json` → `peerDependenciesMeta` (agregar `@radix-ui/react-toggle`, `@radix-ui/react-slider`, `bits-ui` como opcionales, ver Fase 6)

## Implementation Steps

1. Crear `shadcn-theme.css` con las CSS variables estándar de Shadcn (`--background`, `--foreground`, `--primary`, `--border`, `--radius`, etc., paleta zinc por defecto) y el bloque `@theme inline {...}`.
2. React: `MediaLibraryGrid` usa `@radix-ui/react-toggle` (`Toggle.Root`) para cada item del grid en vez de `<button aria-pressed>` plano.
3. React: `ImageEditor` usa `@radix-ui/react-slider` para el control de zoom (reemplaza el `<input type="range">` plano), preservando `applyZoom()` sin cambios.
4. Svelte: mismo patrón con `bits-ui` (`Toggle`, `Slider` — API de bits-ui v2, confirmada contra la doc oficial vía WebFetch antes de escribir el código, ya que difiere de v1/v0).
5. Clases Tailwind + `shadcn-theme.css` para el resto del look (botones `rounded-md border border-input bg-background`, etc. — paleta idéntica a las capturas de referencia del usuario).
6. Documentar en el header de cada archivo qué peer dependency exacta necesita.

## Success Criteria

- [x] `pnpm --filter @modularcore/media-picker typecheck` verde con `@radix-ui/react-*` como devDependency (para que TS resuelva tipos en el monorepo; el consumidor final los instala como peer).
- [x] `bits-ui` se agrega como devDependency de `apps/web` (ya cubierto en Fase 2) para que el preview compile.
- [x] Verificado visualmente en navegador (`pnpm --filter web dev`): Toggle y Slider renderizan y funcionan correctamente en el playground, con foco/estado visual de Radix/bits-ui.

## Risk Assessment

Medio. Riesgo principal: `bits-ui` (Svelte) y `@radix-ui/react-*` (React) tienen APIs distintas (no son "el mismo paquete en dos frameworks") — cada implementación debe consultar la doc oficial de la versión instalada en vez de asumir paridad 1:1 de nombres/props. Mitigación: revisar `bits-ui` changelog/docs al momento de instalar (Fase 2) antes de escribir el Svelte de esta fase, ya que la API de v1 cambió respecto a v0.
