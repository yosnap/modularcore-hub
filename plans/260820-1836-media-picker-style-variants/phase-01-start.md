---
phase: 1
title: "Component Variant Scaffolding"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Component Variant Scaffolding

## Overview

Crea la estructura de carpetas y los contratos de props compartidos para las 3 variantes, sin escribir aún el JSX/markup final. Establece las convenciones que las Fases 3-5 seguirán en paralelo sin pisarse.

## Requirements

- Funcional: cada variante expone los mismos 6 componentes con las MISMAS props públicas que la versión headless actual (`MediaLibraryGrid`, `FolderSelect`, `MimeTypeFilter`, `ImageEditor`, `BulkActionsBar`, `RemoteUrlLoader`) — solo cambia el markup/estilos internos, nunca la interfaz.
- No funcional: cero lógica de negocio nueva; cada componente de variante importa tipos desde `../../../core/*.js` y `../../../adapters/{react,svelte}/*` exactamente igual que su contraparte headless.

## Architecture

```
packages/media-picker/ui/
  react/
    MediaLibraryGrid.tsx        # existente, headless, intacto
    FolderSelect.tsx            # ...
    tailwind/
      MediaLibraryGrid.tsx
      FolderSelect.tsx
      MimeTypeFilter.tsx
      ImageEditor.tsx
      BulkActionsBar.tsx
      RemoteUrlLoader.tsx
    shadcn/
      (mismos 6 archivos)
    vanilla/
      (mismos 6 archivos + media-picker.css)
  svelte/
    MediaLibraryGrid.svelte     # existente, headless, intacto
    ...
    tailwind/ shadcn/ vanilla/  # misma estructura que react/
```

Cada archivo de variante reexporta el MISMO nombre de export que el original (`export function MediaLibraryGrid(...)`) para que el import en el consumidor sea idéntico salvo la ruta: `from '@modularcore/media-picker/ui/react/tailwind/MediaLibraryGrid'` vs `.../ui/react/MediaLibraryGrid`.

## Related Code Files

- Create: `packages/media-picker/ui/react/{tailwind,shadcn,vanilla}/.gitkeep` (placeholders, se reemplazan en Fases 3-5)
- Create: `packages/media-picker/ui/svelte/{tailwind,shadcn,vanilla}/.gitkeep`
- Read (contrato, no modificar): `packages/media-picker/ui/react/*.tsx`, `packages/media-picker/ui/svelte/*.svelte`, `packages/media-picker/adapters/react/use-media-picker.ts`, `packages/media-picker/adapters/svelte/create-media-picker.svelte.ts`

## Implementation Steps

1. Crear las 6 carpetas vacías (`ui/react/{tailwind,shadcn,vanilla}/`, `ui/svelte/{tailwind,shadcn,vanilla}/`).
2. Documentar en un comentario de cabecera (igual al patrón ya usado en `MediaLibraryGrid.tsx` — ver "Deliberately unstyled...") el propósito de cada variante, ej: `/** Tailwind variant: same props/behavior as the headless MediaLibraryGrid, styled with Tailwind utility classes only. No component library dependency. */`.
3. Confirmar (leyendo `packages/media-picker/package.json` `exports`) qué entradas de `exports` necesitará cada nuevo archivo — no editarlo aún, solo listar para la Fase 6.

## Success Criteria

- [x] 6 carpetas creadas, vacías o con placeholder.
- [x] Lista de props/contratos por componente confirmada contra el código headless actual (sin discrepancias).

## Risk Assessment

Bajo. Fase puramente estructural, sin código funcional nuevo. Único riesgo: que Fases 3-5 diverjan en el contrato de props si no se documenta bien aquí — mitigado por el comentario de cabecera + esta tabla de contratos.
