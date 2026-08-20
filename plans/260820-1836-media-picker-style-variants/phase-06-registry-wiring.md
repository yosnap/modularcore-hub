---
phase: 6
title: "Registry Wiring"
status: completed
priority: P2
effort: "3h"
dependencies: [3, 4, 5]
---

# Phase 6: Registry Wiring

## Overview

Actualiza `packages/media-picker/modularcore.json` para que el tarball del registry incluya las 3 variantes nuevas (además de los archivos headless existentes, sin removerlos). Regenera y verifica el registry.

## Requirements

- Funcional: `pnpm --filter web build:registry` produce un `media-picker.tar.gz` que contiene TODOS los archivos: `core/`, `adapters/`, `ui/react/*.tsx` (headless), `ui/react/{tailwind,shadcn,vanilla}/*.tsx`, `ui/svelte/*.svelte` (headless), `ui/svelte/{tailwind,shadcn,vanilla}/*.svelte`, más `ui/shadcn-theme.css` y `ui/vanilla-styles.css`.
- No funcional: retrocompatible — un consumidor que ya corrió `modularcore add media-picker` antes de esta fase y vuelve a correrlo no pierde ni rompe nada (los `target` paths existentes no cambian).

## Related Code Files

- Modify: `packages/media-picker/modularcore.json` (agregar ~38 entradas nuevas a `files[]`: 18 React + 18 Svelte + 2 CSS compartidos)
- Modify: `packages/media-picker/package.json` → `exports` (agregar entradas `./ui/react/tailwind/MediaLibraryGrid`, etc. si se quiere que sean importables como paquete npm además de copy-code — evaluar si aplica dado que el paquete es `"private": true` y se distribuye vía registry, no vía npm publish; si NO se publica a npm, este paso es opcional y se puede omitir)
- Modify: `packages/media-picker/package.json` → `peerDependenciesMeta` (agregar `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-tabs` como opcionales, ver Fase 4)

## Implementation Steps

1. Por cada uno de los 36 archivos de componente + 2 CSS compartidos, agregar una entrada en `modularcore.json` `files[]` con `path` (relativo al package root) y `target` (ej: `src/modularcore/media-picker/ui/react/tailwind/MediaLibraryGrid.tsx`), `type: "ui"`, `encoding: "utf8"` — seguir exactamente el patrón ya usado para las entradas headless existentes.
2. Confirmar contra `packages/registry/src/schema.zod.ts` que el schema no requiere cambios (los nuevos archivos son del mismo `type: "ui"` que ya existe, no se necesita un campo `variant` nuevo — ver Assumption #1 del plan: no hay filtrado selectivo).
3. Correr `pnpm --filter web build:registry` y verificar en `apps/web/registry-data/media-picker.tar.gz` que los 38 archivos nuevos están presentes (`tar -tzf media-picker.tar.gz | wc -l`).
4. Verificar que `apps/web/src/routes/c/media-picker` (página de catálogo) sigue renderizando sin errores y el botón de descarga sigue funcionando.
5. Agregar un changeset (`pnpm changeset`) para `@modularcore/media-picker`: `minor` — nueva funcionalidad (variantes de estilo), no breaking change.

## Success Criteria

- [x] `modularcore.json` válido contra `registry-data-schema.zod.ts` (correr `pnpm --filter web build:registry` sin errores de validación Zod).
- [x] Tarball generado incluye los 38 archivos nuevos + todos los existentes (conteo exacto verificado).
- [x] `pnpm changeset status` muestra el bump pendiente para `@modularcore/media-picker`.

## Risk Assessment

Bajo-medio. Riesgo: el tarball crece considerablemente (de ~7 a ~45 archivos UI) — aceptar el trade-off documentado en Assumption #1 del plan (mismo componente, sin registry components separados). Si en el futuro se detecta que el tamaño del tarball es un problema real de UX de descarga, evaluar entonces el filtrado selectivo por variante (fuera de alcance de esta fase, YAGNI).
