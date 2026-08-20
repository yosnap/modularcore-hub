---
phase: 3
title: "Tailwind Style Variant"
status: completed
priority: P1
effort: "6h"
dependencies: [1]
---

# Phase 3: Tailwind Style Variant

## Overview

Implementa los 6 componentes (React + Svelte) con clases de utilidad Tailwind puras — sin librería de componentes, sin Radix/bits-ui. Paralelizable con Fases 4 y 5 (carpetas disjuntas).

## Requirements

- Funcional: mismo comportamiento que la versión headless (mismos props, mismos callbacks, mismos data-attributes para tests: `data-selected`, `role="grid"`, `aria-pressed`, `role="alert"`, `role="toolbar"`, `aria-busy` — se preservan TODOS los atributos de accesibilidad que ya existen, solo se agregan clases visuales).
- No funcional: sin dependencias nuevas más allá de Tailwind (ya cubierto en Fase 2 para el preview; el consumidor final trae su propio Tailwind).

## Related Code Files

- Create: `packages/media-picker/ui/react/tailwind/MediaLibraryGrid.tsx` (grid con `grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2`, borde `ring-2 ring-zinc-900` en seleccionado)
- Create: `packages/media-picker/ui/react/tailwind/FolderSelect.tsx`
- Create: `packages/media-picker/ui/react/tailwind/MimeTypeFilter.tsx`
- Create: `packages/media-picker/ui/react/tailwind/ImageEditor.tsx`
- Create: `packages/media-picker/ui/react/tailwind/BulkActionsBar.tsx`
- Create: `packages/media-picker/ui/react/tailwind/RemoteUrlLoader.tsx`
- Create: `packages/media-picker/ui/svelte/tailwind/{MediaLibraryGrid,FolderSelect,MimeTypeFilter,ImageEditor,BulkActionsBar,RemoteUrlLoader}.svelte`
- Reference (contrato de props, NO modificar): equivalentes en `packages/media-picker/ui/react/*.tsx` y `packages/media-picker/ui/svelte/*.svelte`

## Implementation Steps

1. Por cada componente headless, copiar la lógica de eventos/estado tal cual (son casi todos "controlados", sin estado propio salvo `ImageEditor`/`FolderSelect` que ya usan `useState`/`$state` locales — se mantiene igual).
2. Reemplazar el markup: `<div style={{...}}>` → `<div className="...">` (React) / `style="..."` inline → `class="..."` (Svelte), usando la paleta neutral que se ve en las capturas de referencia del usuario (grises `zinc-*`, bordes `rounded-lg`, focos `ring-2 ring-blue-500`).
3. `ImageEditor`: reproducir el layout de "Editar imagen" de la captura de referencia (panel de proporción como pills `rounded-full`, slider de zoom con `accent-*`, botones rotar/voltear como iconos en fila) — reutilizando `applyZoom()` sin cambios (es lógica pura, no UI).
4. `MediaLibraryGrid`: grid de tarjetas con nombre de archivo + tamaño truncado (como en "Biblioteca de medios" de la captura), thumbnail `aspect-square object-cover rounded-md`.
5. Verificar accesibilidad: cada componente sigue pasando los mismos `role`/`aria-*` que el original — copiar 1:1, no improvisar nuevos roles.

## Success Criteria

- [x] `pnpm --filter @modularcore/media-picker typecheck` verde para los 6 archivos React nuevos.
- [x] `pnpm --filter @modularcore/media-picker build` (Svelte se compila vía `svelte-check` en `apps/web`, ver Fase 7) sin errores en los 6 `.svelte` nuevos.
- [x] Ningún archivo nuevo supera 250 líneas (son componentes pequeños; si `ImageEditor` variant crece, extraer sub-componentes locales en el mismo `tailwind/` folder, ej. `ImageEditorControls.tsx`).

## Risk Assessment

Bajo. Riesgo: divergencia de comportamiento vs. headless si se toca lógica al copiar — mitigado por la regla explícita de "copiar lógica 1:1, solo cambia markup/clases" y por los tests existentes en `packages/media-picker/test/ui/image-editor-zoom.test.ts` (verificar que `applyZoom` se sigue important sin modificar, no reimplementar).
