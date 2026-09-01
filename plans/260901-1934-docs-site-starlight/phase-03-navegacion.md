---
phase: 3
title: "Marca, i18n y navegación (IA)"
status: pending
priority: P1
effort: "3-4h"
dependencies: [2]
---

# Fase 3: Marca, i18n y navegación (arquitectura de información)

## Overview

Aplicar la identidad de marca y definir **la tabla única de páginas** (sidebar = fuente de verdad),
que la Fase 4 usa directamente en vez de mantener su propio árbol de ficheros por separado
(red-team, Assumption Destroyer Finding 3: el sidebar de esta fase y el árbol de la Fase 4 original
no contaban lo mismo — 4 páginas huérfanas). A partir de esta fase, **hay un solo lugar donde vive la
lista de páginas**: el bloque `sidebar` de `astro.config.mjs`, verificado por
`apps/docs/scripts/check-coverage.mjs` (creado en Fase 2).

## Requirements

- Funcional: sidebar completo con 5 secciones de primer nivel, cubriendo los 3 pilares sin
  solapamiento, con **el mismo número de entradas que ficheros creará la Fase 4** — no dos conteos
  distintos.
- No funcional: colores/tipografía coinciden exactamente con `assets/brand-tokens.css`, importados
  (no replicados) desde la fuente única del repo.

## Related Code Files

- Create: `apps/docs/src/styles/brand.css`
- Create: `apps/docs/public/` (copia de `assets/favicon/*`, `assets/logo/svg/*`)
- Modify: `apps/docs/astro.config.mjs` (bloque `sidebar` completo, `customCss`, `logo`, `favicon`)

## Implementation Steps

1. Crear `apps/docs/src/styles/brand.css` con **`@import` directo de `assets/brand-tokens.css`**
   (red-team, Assumption Destroyer Finding 10 — el repo ya tiene un patrón de fuente única:
   `apps/web/src/app.css` importa ese mismo fichero con el comentario "shared source of truth"; no
   replicar los tokens a mano, evita divergencia futura entre `modularcorehub.com` y
   `docs.modularcorehub.com`). Verificar en Fase 2/paso 8 (build Docker) que el `assets/` copiado al
   contexto de build resuelve ese import sin problema de `server.fs.allow` fuera de la raíz de
   `apps/docs` (si Astro lo bloquea en dev, documentar la excepción de `vite.server.fs.allow` aquí).
   Mapear las variables `--mc-*` a `--sl-color-*` de Starlight. Tipografías Geist (UI)/Inter
   (body)/Geist Mono (código) vía `@fontsource-variable/*` (ya declaradas como dependencia en Fase
   2, paso 1).
2. Copiar favicon/logo a `apps/docs/public/` (duplicación aceptada, mismo patrón que
   `apps/web/static/`).
3. Definir el `sidebar` completo en `astro.config.mjs` con la estructura de 5 secciones acordada en
   la síntesis del debate — **esta es la tabla canónica, Fase 4 la usa literalmente, no la redefine**:
   ```
   1. Empezar             → Introducción · Instalación · Inicio rápido
   2. Conceptos            → Arquitectura · Los 3 pilares · Componentes headless (copy-code) · Versionado de la doc
   3. Referencia            (los 3 pilares anidados aquí)
      ├── Herramientas
      │   ├── CLI  → Visión general · init · add · list · search · diff · update
      │   ├── MCP  → Visión general (transporte stdio) · search_components · get_component · install_component · check_updates
      │   └── Web  → Catálogo · Endpoints del registry
      ├── Componentes → Visión general · AI Chat · Auto-SEO · Media Picker · Modals · Hello Core
      └── Playground  → Qué es y cómo funciona · AI Chat · Auto-SEO · Media Picker · Modals
   4. Guías                 → Instalar un componente · Actualizar componentes · Migrar entre versiones · Contribuir a la doc
   5. Solución de problemas → Instalación · CLI · MCP · Registry
   ```
   **Resuelto (pregunta abierta 7 del plan, confirmada por el usuario): ambas secciones entran en
   esta entrega**, con fuente verificada por página (nunca contenido inventado):
   - Instalar un componente / Actualizar componentes → `packages/cli/src/commands/{add,update,diff}.ts`.
   - Migrar entre versiones → mecanismo de `freeze-version.mjs` (Fase 5); describe el proceso
     genérico, no requiere que exista ya una versión archivada real.
   - Contribuir a la doc → `CONTRIBUTING.md` (enlaza, no duplica).
   - Instalación (troubleshooting) → requisitos de Node/pnpm ya documentados en `README.md`/`CONTRIBUTING.md`.
   - CLI (troubleshooting) → `packages/cli/src/errors.ts`, `packages/cli/src/format-error.ts` (mensajes de error reales del CLI).
   - MCP (troubleshooting) → `packages/mcp-server/src/errors.ts`.
   - Registry (troubleshooting) → `packages/registry-client/src/errors.ts`, `docs/deployment.md`.
   Usar entradas de sidebar explícitas (no `autogenerate`), en español, en el mismo orden que se
   implementará en Fase 4.
4. Verificar contraste de color en tema claro y oscuro.
5. Si se decide usar una isla Svelte en alguna página (validado en Fase 1/S3): montar una de prueba
   con `client:visible` y confirmar que hidrata en el navegador.
6. Ejecutar `apps/docs/scripts/check-coverage.mjs` (creado en Fase 2) contra este sidebar vacío de
   páginas — debe fallar (no hay páginas aún), confirmando que el script realmente compara contra el
   sidebar real y no está hardcodeado.

## Success Criteria

- [x] El sidebar renderiza las 5 secciones de primer nivel en el orden indicado. Verificado en el build real (`astro.config.mjs`) y en las rutas generadas.
- [x] El número de páginas es exactamente 44. Verificado: `find apps/docs/src/content/docs -name '*.md*' | wc -l` = 44.
- [x] `apps/docs/scripts/check-coverage.mjs` ejecuta y falla de forma esperada. Observado en vivo durante la implementación: el primer `pnpm --filter docs build` (antes de escribir contenido) falló listando 57 páginas/comandos/tools faltantes con evidencia — confirmó que el script compara contra el sidebar real, no una lista hardcodeada. También detectó en vivo un slug real mal formado (`referencia/herramientas/index` vs. la convención de Astro `referencia/herramientas`), validando el guardarraíl más allá de lo previsto en el plan.
- [x] El color primario del sitio coincide con `#4F46E5`. Verificado: `4f46e5` presente en el CSS compilado servido por el contenedor real (`/_astro/common.*.css`).
- [x] Búsqueda ⌘K (Pagefind) abre y responde. Verificado: `/pagefind/pagefind.js` y `/pagefind/pagefind-entry.json` responden 200 desde el contenedor Docker real; el build reporta "Found 45 HTML files" indexados.
- [x] Playground es una sección de tercer nivel con página propia de "qué es/cómo funciona" + 4 páginas de demo. Verificado en el sidebar y en el árbol de contenido real (`referencia/playground/{index,ai-chat,auto-seo,media-picker,modals}.md`).

## Risk Assessment

- **Riesgo (red-team Finding 11, mitigado por diseño en esta fase):** que Fase 4 vuelva a definir su
  propio árbol de páginas en vez de leer este sidebar. Mitigación: Fase 4 no enumera páginas de
  nuevo, referencia esta sección literalmente.
- **Riesgo:** IA discutida tras ver el resultado real. Señal: el usuario pide reordenar tras revisar.
  Respuesta pre-decidida: el sidebar es un único objeto en `astro.config.mjs`; reordenar es barato
  en esta fase (por eso va antes que el contenido).
- **Rollback:** revertir `astro.config.mjs` al estado de Fase 2 y borrar `src/styles/`, `public/`
  añadidos. Sin efecto en el resto del monorepo.
