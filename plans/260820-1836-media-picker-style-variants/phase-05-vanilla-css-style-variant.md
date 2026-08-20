---
phase: 5
title: "Vanilla CSS Style Variant"
status: completed
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 5: Vanilla CSS Style Variant

## Overview

Implementa los 6 componentes con CSS plano (sin framework, sin dependencia de terceros), bundler-agnóstico — funciona igual en Webpack, Vite, o sin bundler (import directo de `.css`). Es la opción para consumidores que no usan Tailwind ni Shadcn. Paralelizable con Fases 3 y 4.

## Requirements

- Funcional: mismo comportamiento/props que headless.
- No funcional: CERO dependencias nuevas (ni Tailwind, ni Radix/bits-ui) — solo un archivo `.css` con clases BEM-ish (`.mc-media-grid`, `.mc-media-grid__item--selected`) importado por cada componente.

## Related Code Files

- Create: `packages/media-picker/ui/react/vanilla/{MediaLibraryGrid,FolderSelect,MimeTypeFilter,ImageEditor,BulkActionsBar,RemoteUrlLoader}.tsx`
- Create: `packages/media-picker/ui/svelte/vanilla/{MediaLibraryGrid,FolderSelect,MimeTypeFilter,ImageEditor,BulkActionsBar,RemoteUrlLoader}.svelte`
- Create: `packages/media-picker/ui/vanilla-styles.css` (compartido por React y Svelte, igual que `shadcn-theme.css` en Fase 4)

## Implementation Steps

1. Crear `vanilla-styles.css` con clases con prefijo `mc-` (evita colisión con clases del proyecto consumidor) replicando visualmente el mismo look neutral de las capturas de referencia (bordes redondeados, grises suaves) pero sin ninguna utility class — solo CSS con selectores de clase.
2. React: cada componente importa `import '../../vanilla-styles.css';` (side-effect import, funciona en Webpack/Vite/Rollup sin config extra) y usa `className="mc-..."`.
3. Svelte: mismo patrón vía `<link>`/`@import` en el `.svelte` o import del CSS compartido — usar el patrón estándar de SvelteKit para CSS global de componente (`<style>@import '../../vanilla-styles.css';</style>` o import directo, verificar cuál compila limpio en `apps/web`).
4. Mantener paridad de estructura de markup con las otras 2 variantes (mismo DOM shape, solo difieren las clases) para que las 3 variantes sean intercambiables sin sorpresas de layout.

## Success Criteria

- [x] `pnpm --filter @modularcore/media-picker typecheck` verde.
- [x] `vanilla-styles.css` no depende de ningún preprocesador (CSS puro, compatible con `<link rel="stylesheet">` directo sin build step, cumpliendo el requisito PRD "funciona con Webpack, Vite o sin bundler").

## Risk Assessment

Bajo. Único riesgo: que el import de CSS compartido (`vanilla-styles.css`) no resuelva igual en un consumidor sin bundler (import ES nativo de `.css` no es válido JS) — mitigar documentando en el header del archivo que consumidores "sin bundler" deben copiar el `<link>` a `vanilla-styles.css` manualmente en su HTML, en vez de depender del `import` en el `.tsx`/`.svelte`.
