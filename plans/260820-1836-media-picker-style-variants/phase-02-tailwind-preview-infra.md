---
phase: 2
title: "Tailwind Preview Infra"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Tailwind Preview Infra

## Overview

`apps/web` (SvelteKit) hoy NO tiene Tailwind CSS instalado — todo el sitio usa CSS plano por componente (`<style>` por archivo `.svelte`). Se instala Tailwind CSS v4 (CSS-first, sin `tailwind.config.js`) **globalmente** (decisión confirmada en `plan.md` → Validation Log, Sesión 1: el usuario prefirió dejar el sitio entero listo para usar Tailwind, no acotarlo al playground), más `bits-ui` para la variante Shadcn en Svelte (usada en Fase 4/7).

<!-- Updated: Validation Session 1 - alcance de Tailwind cambia de "solo ruta playground" a "global en apps/web" -->

## Requirements

- Funcional: Tailwind CSS está disponible en CUALQUIER ruta/componente de `apps/web`, no solo el playground de media-picker; las clases usadas en `ui/svelte/tailwind/*.svelte` y `ui/svelte/shadcn/*.svelte` se procesan correctamente.
- No funcional: instalar Tailwind globalmente NO implica migrar el CSS existente de otros componentes/rutas (catálogo, docs, otros playgrounds) — eso es Non-Goal explícito de este plan. Esta fase solo habilita la capacidad; no reescribe estilos ya existentes.

## Architecture

<!-- Updated post-implementation (2026-08-20): 3 detalles reales de la implementación que se
desviaron de lo planeado originalmente aquí, descubiertos empíricamente durante el build: -->

- `apps/web/vite.config.ts`: plugin `@tailwindcss/vite` con `{ optimize: false }` (antes del plugin `sveltekit()`). El flag `optimize: false` es necesario porque con rolldown-vite (el bundler de este repo) el paso interno de minificación del plugin de Tailwind invoca lightningcss sin conocer los at-rules propios de Tailwind, generando warnings espurios de "Unknown at rule" — workaround documentado en un comentario del propio `vite.config.ts` (ver https://github.com/tailwindlabs/tailwindcss/discussions/19530).
- `apps/web/src/app.css` (nuevo): `@import 'tailwindcss/theme' layer(theme);` + `@import 'tailwindcss/utilities' layer(utilities);` — NO `@import 'tailwindcss';` completo, para omitir Preflight (el reset de estilos nativos rompería visualmente el resto del sitio, que sigue con CSS plano). También incluye: (a) dos directivas `@source` apuntando a `packages/media-picker/ui/{react,svelte}` — sin esto, Tailwind no escanea `node_modules` (ni el symlink del workspace pnpm hacia el paquete), y NINGUNA clase Tailwind usada en las variantes se generaba (confirmado empíricamente, no es una suposición); (b) el bloque `@theme inline {...}` + las variables `:root`/`.dark` de Shadcn, embebidas directamente en vez de `@import`adas desde `packages/media-picker/ui/shadcn-theme.css` — un `@import` anidado de ese archivo deja `@theme` sin procesar en este bundler (confirmado con varios rebuilds), así que `app.css` mantiene su propia copia sincronizada a mano.
- `apps/web/src/routes/+layout.svelte`: importar `../app.css` una sola vez a nivel raíz — así Tailwind queda disponible en todas las rutas sin tocar cada página individualmente.
- `bits-ui` como dev dependency de `apps/web` (necesaria para que Svelte compile los componentes `shadcn/*.svelte` de Fase 4 quienes usan sus primitivas).

## Related Code Files

- Modify: `apps/web/package.json` (agregar `tailwindcss`, `@tailwindcss/vite`, `bits-ui` a `devDependencies`)
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/src/routes/+layout.svelte` (import global de `app.css`)
- Create: `apps/web/src/app.css`

## Implementation Steps

1. `pnpm --filter web add -D tailwindcss @tailwindcss/vite bits-ui`.
2. Agregar el plugin Tailwind a `vite.config.ts` (patrón estándar Tailwind v4 + Vite, sin config file adicional; verificar orden de plugins junto al de `@sveltejs/vite-plugin-svelte`).
3. Crear `apps/web/src/app.css` con `@import "tailwindcss";` y las variables de tema Shadcn por defecto (zinc) en `@theme`.
4. Importar `app.css` en `apps/web/src/routes/+layout.svelte` (una sola línea, a nivel raíz — afecta todas las rutas).
5. Verificar con un `<div class="p-4 bg-zinc-900 text-white">test</div>` temporal en cualquier página (ej. home) que las utilities compilan; remover el div de prueba.
6. Confirmar que el CSS existente de otras rutas (`<style>` scoped por componente Svelte) sigue funcionando sin conflicto — Tailwind y CSS scoped de Svelte coexisten sin colisión de especificidad relevante en este caso.

## Success Criteria

- [x] `pnpm --filter web dev` sirve CUALQUIER ruta del sitio con Tailwind disponible.
- [x] El CSS existente de rutas no tocadas por este plan (`/`, `/c/*`, `/registry`, playground `ai-chat`) sigue viéndose exactamente igual que antes — cero regresión visual (Tailwind se agrega, no reemplaza nada; sin Preflight, verificado visualmente).
- [x] `pnpm --filter web build` no falla; utilities de Shadcn/Tailwind confirmadas presentes en el CSS generado (`.bg-background{background-color:hsl(var(--background))}` verificado en el output).

## Risk Assessment

Bajo-medio. Riesgo principal: que Tailwind v4 + `@sveltejs/vite-plugin-svelte` tengan un conflicto de orden de plugins en `vite.config.ts` — mitigado siguiendo el orden recomendado por la doc oficial de Tailwind v4 (`@tailwindcss/vite` antes del plugin de Svelte). Si falla, fallback: Tailwind vía PostCSS clásico (`postcss.config.js` + `@tailwindcss/postcss`).
