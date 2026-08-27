---
phase: 7
title: "Tests, Docs, Playground y Registry"
status: pending
priority: P1
effort: "1-1.5d"
dependencies: [5, 6]
---

# Phase 7: Tests, Docs, Playground y Registry

## Overview

Cierre de integración: suite de tests consolidada (incl. config jsdom+svelte NUEVA), docs, playground
en `apps/web`, completar `modularcore.json` + `package.json`, registrar en el registry, y crear el
changeset. Deja `pnpm build && pnpm test` verde con el paquete integrado.

## Requirements

- Funcional: tests `test/{core,providers,ui,smoke}` cubriendo la Test Matrix del `plan.md`.
- Funcional: playground SvelteKit en `apps/web/src/routes/playground/modals/+page.svelte` con provider
  de demo mostrando cada tipo de overlay.
- Funcional: `modularcore.json` lista TODOS los archivos copy-code; `package.json` `files`/`exports`
  apuntan a rutas reales (React→dist explícito; Svelte→raw).
- No funcional: componente en el catálogo web y servido por el registry; `apps/web` declara la dep.

## Architecture

### Config de tests UI (NUEVA — sin precedente en media-picker, RT-A4)

- Create `packages/modals/vitest.ui.config.ts`: `environment: 'jsdom'`, `plugins: [svelte()]`
  (`@sveltejs/vite-plugin-svelte`), globals. `vitest.config.ts` (Node) sigue para core puro.
- Añadir devDeps a `packages/modals/package.json`: `jsdom`, `@sveltejs/vite-plugin-svelte`,
  `@testing-library/react`, `@testing-library/svelte`, `@testing-library/dom` (o el subset que use el repo).
  Nota: media-picker NO tiene tests de componente ni jsdom (su `vitest.config.ts` es `environment:'node'`
  sin plugin svelte) → esto es infraestructura nueva, no "copiar de media-picker".
- Script `test:ui` en `package.json` → `vitest run --config vitest.ui.config.ts`.

### Tests (`packages/modals/test/**`)

- Node puro (`vitest.config.ts`): `eligibility.test.ts`, `frequency.test.ts`, `storage.test.ts`,
  `triggers.test.ts` (entorno fake), `modals.test.ts` (slots/priority, reload dispone triggers previos,
  toast cap, idempotencia, last-one-wins, provider por llamada), `providers/in-memory.test.ts`.
- jsdom (`vitest.ui.config.ts`): `ui/react-overlays.test.tsx`, `ui/svelte-overlays.test.ts` (Escape,
  focus trap, aria-live, reduced-motion, toast auto-dismiss idempotente, `javascript:` url descartada,
  `message` HTML no ejecuta sin `allowHtml`).
- Helpers: `test/helpers/fake-trigger-env.ts`, `test/helpers/modal-fixtures.ts`.
- Smoke opcional: import de cada subpath de `exports` desde `dist` (valida exports↔dist, RT-A1/A6).

### Playground + dependencia workspace (RT-A1)

- **Modify `apps/web/package.json`**: añadir `"@modularcore/modals": "workspace:*"` a `dependencies`
  y `pnpm install` (sin esto, Vite no resuelve el import — RT-A1). Precedente: `apps/web/package.json:16-21`.
- Create `apps/web/src/lib/demo-modals-provider.ts` — `createInMemoryProvider` con fixtures de cada
  tipo (patrón `apps/web/src/lib/demo-storage-provider.ts:21-82`). Sin credenciales.
- Create `apps/web/src/routes/playground/modals/+page.svelte` — usa `createModals` + `ModalsRenderer.svelte`;
  botones para `manual`/`click`; muestra cada tipo (patrón `playground/media-picker/+page.svelte`).
- Modify `apps/web/src/routes/+page.svelte` — enlace en catálogo. `c/[name]` es data-driven por registry.

### Registry

- Completar `packages/modals/modularcore.json`: `version`+`title`+`registryDependencies` (RT-A2/FM7) y
  `files[]` con cada archivo core/adapters/ui/safe/a11y + `target` `src/modularcore/modals/...` +
  `type` (`headless-core`|`adapter`|`ui`) + `encoding:"utf8"`.
- `apps/web/scripts/build-registry.mjs` descubre `packages/*` con `modularcore.json`
  (`build-registry.ts:32-46`) → `modals` se recoge automáticamente (verificado por RT-Assumption).

### Docs (`packages/modals/docs/**` + README)

- `README.md`: qué es, patrón provider sin DB, uso React+Svelte, tipos de overlay, a11y/responsive,
  **frontera de seguridad** (los 3 campos no confiables, `allowHtml`).
- `docs/prisma-tracking-endpoint-example.md`: sólo docs — cómo cablear `trackView`/`trackInteraction`
  a un backend Prisma propio (sin dependencia real; análogo a `media-picker/docs/s3-presign-endpoint-example.md`).
- `docs/frequency-client-side.md`: divergencia vs codeia (server-side) explicada.
- Create `plans/260825-1940-modals-overlay-system/reports/codeia-popup-reference-snapshot.md`
  (RT-S8): snapshot congelado de las reglas de frecuencia/targeting/trigger extraídas de codeia-v2
  (con las citas file:line), para que la correctitud sea verificable sin el repo externo.

## Data Flow

Fixtures → `demo-modals-provider` → `createModals` → `ModalsRenderer` → overlays. `build-registry.mjs`
lee `modularcore.json` (fuente) → índice + tarball servidos por `routes/registry/[file]`.

## Related Code Files

- Create: `packages/modals/test/**`, `packages/modals/docs/**`, `packages/modals/vitest.ui.config.ts`, `reports/codeia-popup-reference-snapshot.md`
- Create: `apps/web/src/lib/demo-modals-provider.ts`, `apps/web/src/routes/playground/modals/+page.svelte`
- Modify: `apps/web/package.json` (dep workspace — RT-A1), `packages/modals/package.json` (devDeps+files+exports finales), `packages/modals/modularcore.json` (files+version+title), `apps/web/src/routes/+page.svelte`, `.changeset/*`
- Reference: `apps/web/scripts/build-registry.mjs`, `packages/registry/src/schema.zod.ts:48-56`, `packages/media-picker/{README.md,docs/*}`

## Implementation Steps

1. `vitest.ui.config.ts` + devDeps de testing; escribir tests core (Node) y UI (jsdom).
2. `apps/web/package.json` dep `@modularcore/modals: workspace:*`; `pnpm install`.
3. `demo-modals-provider.ts` + playground `+page.svelte`; enlace en catálogo.
4. Completar `modularcore.json` (`version`/`title`/`registryDependencies`/`files[]`) y `package.json` `files`/`exports`; validar contra `registry/src/schema.zod.ts`.
5. Regenerar registry; verificar `modals` en `/registry/index.json` y `c/modals`.
6. README + docs + snapshot de referencia codeia.
7. `pnpm changeset` (minor, `@modularcore/modals`); `pnpm build && pnpm test && pnpm --filter @modularcore/modals test:ui` verde.

## Success Criteria

- [x] `pnpm test` (Node) + `test:ui` (jsdom) verdes incluyendo `packages/modals`.
- [x] Test Matrix del `plan.md` cubierta; incluye tests de seguridad (url/message) y de reload-dispone-triggers.
- [x] `apps/web` declara la dep y el playground muestra los 6 tipos con el provider de demo, sin credenciales.
- [x] `modularcore.json` pasa `registryDescriptorSchema` (con `version`/`title`); `modals` en el índice y en el catálogo.
- [x] Smoke de exports: cada subpath importable (React desde dist, Svelte raw).
- [x] Changeset presente; snapshot de referencia codeia commiteado; ningún archivo >1000 líneas.

## Risk Assessment

- **Import no resuelve en playground** (Media→cerrado, Alto, RT-A1) → dep workspace declarada + `pnpm install`.
- **`.svelte` sin transform en vitest** (Media→cerrado, RT-A4) → `vitest.ui.config.ts` con plugin svelte + jsdom.
- **`exports`/`files` desincronizados con dist real** (Media, RT-A5/A6) → smoke de import por subpath; React explícito, Svelte raw + `files:["dist","ui/svelte"]`.
- **manifest rechazado por schema** (Media→cerrado, RT-A2/FM7) → `version`+`title` incluidos.
