---
title: "Modals — Sistema Unificado de Overlays"
description: "Paquete headless multi-framework (React/Svelte) de overlays (modal, fullscreen, banners, slide-in, toast) con patrón provider sin DB, triggers, frecuencia client-side y targeting."
status: done
priority: P1
effort: "5-7 días"
branch: yosnap/Componente-Modal
tags: [monorepo, headless, overlays, modals, banners, provider-pattern, react, svelte, copy-code, a11y, responsive]
created: 2026-08-25
blockedBy: []
blocks: []
---

# Modals — Sistema Unificado de Overlays

## Overview

Nuevo paquete `packages/modals` (`@modularcore/modals`): un **sistema unificado de overlays**
headless que replica exactamente el patrón arquitectónico de `packages/media-picker` (core
agnóstico + patrón provider **sin DB** + adaptadores React/Svelte + UI por framework + manifest
`modularcore.json` + tests vitest + changesets).

Cubre un solo modelo de datos para todos los tipos de overlay (Top banner, Bottom banner,
Slide-in, Modal, Fullscreen, y **Toast** como adición justificada), con orquestación de
**triggers** (page-load/delay/scroll/exit-intent/click/manual), **frecuencia** persistida
client-side (session/localStorage), **targeting** de rutas y **tracking** de vistas/interacciones
vía provider. Todos los overlays **mobile-first responsivos** y **accesibles** (focus trap,
aria-live, Escape, `prefers-reduced-motion`).

El modelo de datos y el comportamiento se inspiran en el `PopupManager` de `codeia-v2` (modelo
Prisma `Popup`), pero **adaptados a tipos TypeScript agnósticos** — sin Prisma, sin API CRUD,
sin backend real. La única dependencia externa es un `ModalsProvider` que el consumidor implementa
(se entrega un provider de referencia en memoria/JSON como copy-code).

### Precedente arquitectónico (respetado, no bloqueante)

El plan `plans/260818-1856-modularcore-hub-mvp-fase-1` (status `done`) estableció el contrato
**"sin auth ni DB"** como decisión de bootstrap del monorepo (`plan.md:16`, Non-Goals `:45-49`).
Modals **respeta ese contrato**: patrón provider sin DB, distribución copy-code, credenciales/
persistencia siempre en el backend del consumidor. No hay dependencia bloqueante entre planes.

## Decisiones de alcance (ya tomadas por el usuario — no reabrir)

1. Nombre `Modals`, paquete `packages/modals`, sistema unificado de overlays.
2. Tipos de overlay: Top banner, Bottom banner, Slide-in, Modal, Fullscreen + adicionales
   justificados. **Todos mobile-first responsivos.**
3. Backend = **patrón provider SIN DB** (como media-picker). Prisma/API real **descartado**.
4. Estilos: seguir el patrón de 3 estilos descargables **si existe** en media-picker.
5. Modo plan: formal completo (`--hard`).

## Hallazgos de research que condicionan el diseño

- **Estilos (verificado):** el mecanismo de "3 estilos descargables" (Tailwind/Shadcn/CSS plano)
  **NO existe hoy** en `packages/media-picker`. No hay carpetas paralelas por estilo; el playground
  (`apps/web/src/routes/playground/media-picker/+page.svelte`) importa **un único set** de
  componentes con classNames mínimos; ni `registry` ni `cli` soportan variantes. Es una decisión
  pendiente (memoria de proyecto, 2026-08-20), aspiracional. → **Modals sigue el patrón REAL
  existente**: un único set headless/minimal por framework. El mecanismo de 3 variantes queda
  **deferido** (ver Non-Goals + Pregunta abierta Q1) para no inventar arquitectura sin precedente
  (YAGNI + condición explícita "si existe" de la decisión #4).
- **Modelo de datos (verificado en codeia-v2 `schema.prisma:2519-2559`):** modelo `Popup` completo
  extraído (tipos, triggers, frecuencia, targeting, tracking). **Divergencia clave:** codeia aplica
  la frecuencia **server-side** vía tabla `PopupView`; Modals **no tiene DB**, así que la frecuencia
  se persiste y evalúa **client-side** (session/localStorage) — ver Fase 2.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Paquete `@modularcore/modals` con doble naturaleza (importable + copy-code) igual que media-picker | P1 |
| 2 | Core headless: modelo de datos de overlays + motor de elegibilidad (targeting/fechas/prioridad/slot) | P1 |
| 3 | Frecuencia client-side (ALWAYS/ONCE_PER_SESSION/ONCE_PER_DAY/ONCE_EVER) vía storage inyectable | P1 |
| 4 | `OverlayManager` (state machine suscribible) + orquestación de triggers con entorno DOM inyectable | P1 |
| 5 | Patrón `ModalsProvider` sin DB + provider de referencia en memoria/JSON + tracking | P1 |
| 6 | Adaptadores React (`use-modals.ts`) y Svelte (`create-modals.svelte.ts`) delgados | P1 |
| 7 | UI por tipo de overlay (React + Svelte), mobile-first y accesible | P1 |
| 8 | Tests (smoke/core/providers/ui) + docs + playground en `apps/web` + registro en registry + changeset | P1 |

## Phases

| # | Phase | Depende de | Ownership de archivos | Status |
|---|-------|-----------|-----------------------|--------|
| 1 | [Scaffold y Modelo de Datos](./phase-01-start.md) | — | `packages/modals/{package.json,tsconfig.json,vitest*,modularcore.json}`, `core/types.ts` | Pending |
| 2 | [Motor de Elegibilidad y Frecuencia](./phase-02-core-eligibility-and-frequency-engine.md) | 1 | `core/eligibility.ts`, `core/frequency.ts`, `core/storage.ts` | Pending |
| 3 | [Manager, Triggers y Provider](./phase-03-core-manager-triggers-and-provider.md) | 2 | `core/modals.ts`, `core/triggers.ts`, `core/provider.ts`, `core/providers/in-memory.ts` | Pending |
| 4 | [Adaptadores + a11y/safe compartido](./phase-04-framework-adapters-react-and-svelte.md) | 3 | `adapters/react/*`, `adapters/svelte/*`, `ui/a11y/*`, `ui/safe/*` | Pending |
| 5 | [UI React por Overlay](./phase-05-react-ui-overlay-components.md) | 4 | `ui/react/*` | Pending |
| 6 | [UI Svelte por Overlay](./phase-06-svelte-ui-overlay-components.md) | 4 | `ui/svelte/*` | Pending |
| 7 | [Tests, Docs, Playground y Registry](./phase-07-tests-docs-playground-and-registry.md) | 5,6 | `test/**`, `docs/**`, `vitest.ui.config.ts`, `apps/web/**`, `.changeset/*` | Pending |

**Ruta crítica:** 1 → 2 → 3 → 4 → {5 ∥ 6} → 7.
Fases 5 y 6 tienen **ownership genuinamente disjunto** (`ui/react/*` vs `ui/svelte/*`) → paralelizables
tras la 4. Las utilidades compartidas agnósticas (`ui/a11y/*` focus-trap/reduced-motion y `ui/safe/*`
url/style) se crean en la **Fase 4** (no en la 5) para que 5 y 6 sólo las **importen**, eliminando
toda edición concurrente entre fases paralelas (RT-SC5).

## Data Flow (alto nivel)

```
Consumidor implementa ModalsProvider (config estática o JSON o su propio backend)
        │  getActiveModals(ctx) → ModalConfig[]   (candidatos crudos)
        ▼
core/eligibility.ts  ── filtra por isActive, ventana de fechas, targeting (pages/excludePages),
        │                y frecuencia (consultando storage client-side) → elegibles
        ▼
core/modals.ts (OverlayManager) ── singleton slots: 1 overlay por slot (priority desc);
        │                toast: lista multi-instancia con cap. Registra triggers (core/triggers.ts,
        │                entorno DOM inyectable). load() dispone SIEMPRE los triggers de la carga previa.
        ▼
trigger dispara → manager ocupa slot / appendea toast, emite estado → adapter (React/Svelte)
        │                re-renderiza UI del tipo. UI aplica frontera de seguridad: message texto
        │                (allowHtml→sanitizer), safeHref/safeImageSrc, rel/referrerpolicy, safeColor.
        ▼
usuario ve overlay → manager llama provider.trackView(evt) [path=pathname sin query] + store.record (frecuencia)
usuario interactúa/cierra → manager llama provider.trackInteraction(evt), libera slot / quita toast
```
**Frontera de confianza:** la salida del provider (`message`/`imageUrl`/button `url`) es contenido
renderizado en el DOM y se trata como **no confiable**; la sanitización/allowlist vive EN EL PAQUETE
(UI, Fase 5/6), no se delega al consumidor.

## Non-Goals

- **Sin DB / sin Prisma / sin API CRUD.** Provider pattern client-side únicamente.
- **Sin backend de firma/tracking real** incluido: `trackView`/`trackInteraction` son hooks que
  el consumidor cablea (el provider de referencia hace no-op / console).
- **Sin las 3 variantes de estilo (Tailwind/Shadcn/CSS plano)** en esta entrega — deferido hasta
  que termine el trabajo en curso (paralelo, fuera de este plan) de estilos descargables en
  media-picker; Modals replicará ese mecanismo una vez esté cerrado allí (evita divergencia). Ver Q1.
- **Sin adaptador vanilla/web-component** (ai-chat lo tiene, pero el usuario pidió React+Svelte;
  YAGNI, descartado definitivamente). Ver Q2.
- **Sin editor de admin / form de configuración** (los campos de codeia inspiran el *modelo*, no
  se reproduce el CRUD admin).
- Tipos de overlay `INLINE` y enums no usados en codeia (`PopupPosition`, `PopupButtonAction`,
  `targetRoles`/RBAC) **no** se implementan (YAGNI; se documentan como extensibles).
- Ningún archivo de código o de plan >1000 líneas.

## Success Criteria

- [ ] `pnpm install && pnpm build && pnpm test` verde con `packages/modals` incluido (vitest workspace lo autodescubre).
- [ ] `@modularcore/modals` exporta core, provider, adaptadores y UI vía `exports` con subpaths (patrón media-picker).
- [ ] `modularcore.json` válido lista todos los archivos con `target`/`type`/`encoding` (formato media-picker).
- [ ] Core cubre los 6 tipos de overlay con 1 overlay por slot, priority desc, ventana de fechas y targeting.
- [ ] Frecuencia client-side probada en Node con storage fake (sin `window`): ALWAYS/ONCE_PER_SESSION/ONCE_PER_DAY/ONCE_EVER.
- [ ] Triggers probados con entorno DOM fake (delay/scroll/exit-intent/click/manual/page-load).
- [ ] Provider de referencia en memoria/JSON funciona en el playground sin credenciales.
- [ ] UI React y Svelte: focus trap en modal/fullscreen, Escape cierra, aria-live en toast/banners, respeta `prefers-reduced-motion`, mobile-first verificado por breakpoint.
- [ ] Playground en `apps/web` renderiza cada tipo de overlay con el provider de demo.
- [ ] Changeset creado; ningún archivo >1000 líneas.

## Test Matrix (resumen; detalle por fase)

| Área | Unit | Integración | E2E/manual |
|------|------|-------------|-----------|
| `eligibility.ts` (targeting/fechas/prioridad/slot) | ✓ (Node, puro) | — | — |
| `frequency.ts` + `storage.ts` | ✓ (storage fake) | ✓ (con manager) | — |
| `triggers.ts` | ✓ (entorno DOM fake) | ✓ (con manager) | — |
| `modals.ts` (OverlayManager) | ✓ (last-one-wins, slots) | ✓ (provider+triggers+freq) | — |
| provider in-memory/JSON | ✓ | smoke (opcional) | — |
| UI React/Svelte (a11y, responsive) | ✓ (jsdom: Escape, focus trap, aria) | — | playground manual |

## Riesgos globales

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|-----------|
| Acoplar core al DOM (window/document/timers) rompe tests en Node | Media | Alto | Entorno DOM + storage **inyectables** (patrón `canvas-environment.ts` / `history/local.ts`); core puro por defecto | 
| Frecuencia client-side divergente de la lógica server de codeia | Media | Medio | Documentar la divergencia; misma semántica de reglas, sólo cambia el sustrato de persistencia | 
| Race conditions (trigger tardío tras cierre/reset) | Media | Medio | Guardas last-one-wins por generación (patrón `MediaPicker.run/commitIfCurrent`) | 
| Fuga de estado si el manager se hace singleton compartido | Baja | Alto | Instancia por adaptador (`useRef`/closure), como media-picker; sin estado module-level | 
| Expectativa de 3 variantes de estilo no cubierta | Media | Bajo | Explicitado en Non-Goals + Q1; entrega headless-first no bloquea variantes futuras | 

## Red Team Review

### Sesión — 2026-08-25 (modo --hard, 4 revisores hostiles)
**Findings:** 23 crudos → deduplicados a 15 · **Accepted:** 15 · **Rejected (evidencia):** 0.
**Severidad (dedup):** 4 Critical, 8 High, 3 Medium. Todos con cita file:line contra este repo o
contradicción cruzada entre fases → pasaron el filtro de evidencia. Reviewers: Security Adversary,
Failure Mode Analyst, Assumption Destroyer, Scope & Complexity Critic.

| # | Finding | Sev | Disp. | Aplicado a |
|---|---------|-----|-------|-----------|
| RT-FM1/SC1 | Toast stacking imposible bajo modelo single-slot | Crit | Accept | Fase 1 (`toasts: ModalConfig[]`), Fase 3 (lista+cap), Fase 5/6 |
| RT-S2 | `message` HTML sin sanitizar + falta flag `allowHtml` | Crit | Accept | Fase 1 (`allowHtml`), Fase 5/6 (renderMarkdownToHtml) |
| RT-S1 | Button `url` `javascript:` XSS (sin allowlist) | Crit | Accept | Fase 4 (`safeHref`), Fase 5/6 |
| RT-A1 | `apps/web/package.json` no declara `@modularcore/modals` | Crit | Accept | Fase 7 |
| RT-S3 | `imageUrl` sin validación de esquema | High | Accept | Fase 4 (`safeImageSrc`) + referrerpolicy, Fase 5/6 |
| RT-S4 | Enlaces sin `rel="noopener noreferrer"` (tabnabbing) | High | Accept | Fase 5/6 |
| RT-A2/FM7 | `modularcore.json` omite `version`/`title` (schema los exige) | High | Accept | Fase 1, Fase 7 |
| RT-A3 | `ui/a11y`(+`ui/safe`) fuera del `include` de tsconfig → no se emite a dist | High | Accept | Fase 1 |
| RT-A4 | No hay precedente jsdom/svelte para tests UI | High | Accept | Fase 1 (`vitest.ui.config.ts`), Fase 7 (devDeps+plugin) |
| RT-FM3 | React `useRef`+`destroy()` deja manager muerto en StrictMode | High | Accept | Fase 4 (recrear-si-destruido) |
| RT-FM4 | `load()` en cambio de ruta no dispone triggers previos → overlay de página equivocada | High | Accept | Fase 3 (`disposeTriggers()` al inicio de load) |
| RT-SC2 | `now` modelado de 3 formas incompatibles | High | Accept | Fase 1 (quita `ctx.now`), 2/3 (único `deps.now()`) |
| RT-SC3 | Provider en constructor + `useRef` → provider stale | High | Accept | Fase 3 (`load(provider,ctx)`), Fase 4 (dep de identidad) |
| RT-FM2/SC4 | Adaptador Svelte fuga listeners (sin lifecycle) | High | Accept | Fase 4 (`$effect` con return `destroy`) |
| RT-S5+S6+S7+FM5+FM6+A5+A6+SC5+SC6+SC7+SC8+S8 | Endurecimientos agrupados (ver abajo) | Med | Accept | Fases 1-7 |

**Grupo Medium/hardening agrupado (todos Accept):**
- RT-S5 CSS injection en `bgColor`/`textColor`/`maxWidth` → `maxWidth` enum cerrado + `safeColor` regex + estilos por binding (Fase 1/4/5/6).
- RT-S6 docstring del provider ampliado: salida = contenido no confiable (Fase 3).
- RT-S7 tracking envía sólo `pathname` (sin query/token) (Fase 1/3).
- RT-FM5 `browserStorage` con probe (patrón `ai-chat/history/local.ts`) + `set` try/catch (Fase 2).
- RT-FM6 timer de toast keyed por id + `dismiss` idempotente (Fase 3/5/6).
- RT-A5 exports Svelte raw + `files:["dist","ui/svelte"]`; RT-A6 exports React explícitos por-archivo a dist (Fase 1/5/6).
- RT-SC5 `ui/a11y`+`ui/safe` creados en Fase 4 → 5∥6 genuinamente disjuntas.
- RT-SC6 eliminar enum muerto `'form-submit'`; RT-SC7 `page-load` = alias de `delay` (un branch) (Fase 1/3).
- RT-SC8 seam de storage consolidado en `FrequencyStore` (menos threading) (Fase 2).
- RT-S8 citas codeia-v2 (repo externo) → inlinear reglas + snapshot congelado en `reports/` (Fase 2/7).

### Whole-Plan Consistency Sweep — 2026-08-25
Delta aplicado y reconciliado en TODAS las fases:
- `OverlaySlot` (single) → `SingletonSlot` + `OverlaysState.toasts` — coherente en Fase 1/3/5/6.
- `InteractionAction` sin `'form-submit'` — Fase 1 y UI (Fase 5/6) sólo emiten button/close/outside.
- `now`: `ctx.now` eliminado (Fase 1); único `deps.now()` (Fase 3) threaded a `filterEligible(...,now)` (Fase 2). Sin firmas residuales con `now:Date` en contexto.
- Provider: fuera del constructor (Fase 3) y por-llamada en adaptadores (Fase 4). Sin `constructor(provider,...)` residual.
- `filterEligible` firma unificada `(configs, path, store, now)` en Fase 2 y su llamador Fase 3.
- `ui/a11y`+`ui/safe`: creados Fase 4; Fase 5/6 "Import (no modificar)"; Fase 1 `include` los añade. Sin "creado aquí" residual en Fase 5.
- Exports: React explícito / Svelte raw + `files` — consistente Fase 1/5/6.
- `modularcore.json` `version`+`title` — Fase 1 y Fase 7.
Sin contradicciones sin resolver. Plan apto para implementación tras revisión del usuario.

## Open Questions — Cerradas (2026-08-25, decisión del usuario)

1. **Variantes de estilo (Tailwind/Shadcn/CSS plano):** confirmado no-bloqueante. Modals se entrega
   headless-first en este plan. El usuario ya tiene en curso, en paralelo, el trabajo de estilos
   descargables para `media-picker` — Modals espera a que ese mecanismo quede terminado y
   estandarizado allí antes de replicarlo, para no inventar una arquitectura de variantes divergente.
   Sin acción en este plan; revisar como trabajo futuro cuando media-picker lo tenga.
2. **Adaptador vanilla/web-component:** **descartado (YAGNI)**, no solo deferido. Se mantiene como
   Non-Goal permanente salvo demanda real futura.
3. **`allowHtml` + sanitizer:** **confirmado markdown-only.** Se usa `renderMarkdownToHtml` de ai-chat;
   HTML arbitrario queda fuera de alcance y documentado como responsabilidad del consumidor si lo necesita.
4. **Multi-tenant/low-trust en `getActiveModals`:** **confirmado.** El contenido del provider se trata
   como no confiable; el saneamiento (XSS, url allowlist, etc.) permanece dentro del paquete Modals
   (RT-S1/S2 se mantienen Críticos y resueltos como ya especifica el plan).

<!-- slug: modals-overlay-system -->
