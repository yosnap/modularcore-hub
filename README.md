# ModularCore Hub

Hub de componentes headless multi-proveedor con distribución propia: Registry HTTP estático +
CLI + Media Picker + AI Chat + Website. Ver `modularcore-hub.md` (PRD) para el contrato completo
y `plans/260818-1856-modularcore-hub-mvp-fase-1/` para el plan de implementación del MVP Fase 1.

## Quickstart

Requisitos: **Node ≥20**, **pnpm ≥9** (vía [corepack](https://nodejs.org/api/corepack.html)).

```bash
corepack enable
pnpm install
pnpm build       # turbo run build (por paquete, con caché)
pnpm typecheck    # turbo run typecheck
pnpm lint         # eslint .
pnpm test         # vitest (modo workspace, jsdom para DOM/canvas)
```

En Fase 1 no hay paquetes todavía (`packages/*`, `apps/*` se llenan en las fases 2-6), por lo que
`build`/`typecheck` no ejecutan tareas (`0 packages`) — comportamiento esperado.

## Estructura del monorepo

```
modularcore-hub/
├─ package.json            # scripts raíz, devDeps compartidas
├─ pnpm-workspace.yaml      # packages/*, apps/*
├─ turbo.json               # pipeline: build, typecheck, test, test:smoke, lint, dev
├─ tsconfig.base.json       # TS compartida (strict, moduleResolution: bundler)
├─ vitest.workspace.ts      # descubre vitest.config de cada paquete
├─ .changeset/               # versionado semántico por paquete
├─ .github/workflows/ci.yml
├─ packages/                 # componentes + cli (fases 2-5) — scope @modularcore/*
└─ apps/web/                 # SvelteKit (fase 2 endpoints, fase 6 UI)
```

## Versionado

Dos ejes distintos (detalle en [`docs/branching-release-strategy.md`](./docs/branching-release-strategy.md)):

- **Hito de repo:** tags Git `v0.1.0..v0.6.0` en `main`, uno por fase del plan.
- **Paquete:** cada `packages/*` versiona/publica de forma independiente vía
  [Changesets](https://github.com/changesets/changesets) (`pnpm changeset`). Apps privadas
  (`apps/web`) se excluyen del publish añadiéndolas a `ignore` en `.changeset/config.json` una vez
  creadas.

## CI

`.github/workflows/ci.yml` separa dos jobs (hardening SA3, ver plan Fase 1):

- **`unit`** — build + typecheck + lint + test (mocks). Corre en todo PR, incluidos forks. Sin secretos.
- **`smokes`** — tests contra proveedores reales. Corre solo en `push` a `develop`/`main`. Requiere
  el servicio MinIO (Media Picker) y los secretos de repo `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `OPENROUTER_API_KEY`. Sin ellos, el job falla
  (comportamiento buscado — decisión S1 del plan: smokes bloqueantes).

## Variables de entorno

Copiar `.env.example` a `.env` y completar. Nunca commitear `.env` real. Ver también el
`.env.example` de cada paquete cuando exista (fases 4/5).

## Branching

Flujo `feature → develop → main` con release por fase. Detalle completo en
[`docs/branching-release-strategy.md`](./docs/branching-release-strategy.md).
