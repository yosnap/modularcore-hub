---
title: "Phase 1: Monorepo Foundation"
status: todo
priority: P1
effort: "3-4d"
dependencies: []
---

# Phase 1: Monorepo Foundation

## Overview

Monorepo reproducible con pnpm Workspaces + Turborepo + Changesets, TS base compartido, lint/format y CI. Sin componentes ni DB. Establece el layout que todas las fases siguientes consumen.

## Requirements

- Funcional: `pnpm install` instala todo; `pnpm build`/`pnpm test`/`pnpm typecheck`/`pnpm lint` orquestados por Turbo con caché.
- Funcional: Changesets configurado para versionado semántico **por paquete** desde el día 1.
- Funcional: CI (GitHub Actions) corre build+typecheck+lint+test en push/PR.
- Funcional: **Vitest** configurado en modo workspace (jsdom para DOM/canvas; soporta React y Svelte) como runner estándar del monorepo. (Validación S1)
- Funcional: **CI con smokes requeridos** (Validación S1) — el workflow provee las credenciales para los smoke tests de Fases 4/5: **MinIO como servicio docker de CI** + secretos `CLOUDINARY_*` y `OPENROUTER_API_KEY`. Sin ellos CI falla (comportamiento buscado).
- No funcional: Node ≥20, pnpm ≥9. `.env.example` raíz. `.gitignore` correcto (node_modules, .turbo, dist, .svelte-kit, .env, apps/web/static/registry build output).
- No funcional: ningún archivo de config supera límites razonables; TS `strict: true`. Scope npm `@modularcore/*`, binario CLI `modularcore` (Validación S1).

## Architecture

Layout del workspace (paquetes se crean vacíos/placeholder aquí, se llenan en sus fases):

```
modularcore-hub/
├─ package.json            # root: scripts turbo, devDeps compartidas
├─ pnpm-workspace.yaml     # packages/*, apps/*
├─ turbo.json             # pipeline: build, test, typecheck, lint, dev
├─ tsconfig.base.json     # config TS compartida (strict, paths)
├─ .changeset/config.json # versionado por paquete, changelog
├─ .github/workflows/ci.yml
├─ eslint.config.js       # flat config
├─ .prettierrc
├─ packages/              # componentes + cli (fases 2-5)
└─ apps/web/              # SvelteKit (fase 2 endpoints, fase 6 UI)
```

`turbo.json` con `dependsOn: ["^build"]` y outputs cacheados (`dist/**`, `.svelte-kit/**`).
Convención de nombres de paquete: `@modularcore/{name}`.

## Related Code Files

- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- Create: `.changeset/config.json`, `.github/workflows/ci.yml`
- Create: `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`, `.env.example`
- Create: `README.md` (raíz, quickstart del monorepo)

## Implementation Steps

1. `git` ya inicializado; crear commit baseline con PRD/reports antes de scaffoldear (opcional, vía git-manager).
2. Inicializar `package.json` raíz (`private: true`, `packageManager: pnpm@...`), `pnpm-workspace.yaml` (`packages/*`, `apps/*`).
3. Añadir Turborepo + `turbo.json` con pipeline build/test/typecheck/lint/dev.
4. `tsconfig.base.json` compartido (strict, `moduleResolution: bundler`, `verbatimModuleSyntax`).
5. Changesets: `pnpm changeset init`, ajustar `config.json` (baseBranch main, changelog por paquete, `access: public`, `ignore: ["@modularcore/web"]` y demás apps privadas → solo `packages/*` se versionan/publican).
6. ESLint flat config + Prettier + Vitest (workspace) + scripts raíz (`lint`, `format`, `typecheck`, `test`).
7. CI: workflow `pnpm install --frozen-lockfile` + `pnpm turbo build test typecheck lint`. Añadir servicio `minio` al job + inyectar secretos `CLOUDINARY_*`, `OPENROUTER_API_KEY` (smokes requeridos, Validación S1). Documentar los secretos necesarios en README.
8. `README.md` raíz con quickstart. Verificar `pnpm install && pnpm build` (sin paquetes aún = no-op verde).

## Success Criteria

- [ ] `pnpm install --frozen-lockfile` reproducible.
- [ ] `pnpm turbo build test typecheck lint` verde (aunque vacío).
- [ ] `pnpm changeset` crea un changeset de prueba correctamente.
- [ ] Vitest workspace corre (aunque sin tests aún) vía `pnpm test`.
- [ ] CI verde en un PR trivial; servicio MinIO y secretos declarados para los smokes de fases posteriores.

## Red Team Hardening (aplicado)

- **SA3 — Secretos de CI ante forks:** el workflow se separa en (a) job **unit/mock sin secretos** que corre en TODO PR (incluidos forks) y (b) job **smokes con secretos** que corre solo en push a ramas protegidas (`develop`/`main`) o vía GitHub Environment aprobado — **nunca** para PRs de fork. Los smokes siguen siendo gate bloqueante en push a protegidas (decisión S1), sin exponer keys a forks.
- **FMA1 — Cache Turbo del registry:** declarar `build:registry.outputs = ["apps/web/static/registry/**"]` y añadir esa ruta a los `inputs` del build de web (o `dependsOn:["build:registry"]` con outputs enlazados). Test de cache-invalidation.
- **FMA5 — Lockfile en merges paralelos:** política obligatoria de rebase sobre `develop` + regenerar `pnpm-lock.yaml` antes de cada PR de fase; `pnpm-lock.yaml` en la lista de archivos de coordinación (fases 3/4/5 no lo tocan a ciegas).

## Risk Assessment

- **Config drift entre paquetes** → `tsconfig.base.json` heredado por todos; ESLint flat config única en raíz.
- **Caché Turbo inválida en CI** → declarar `outputs`/`inputs` explícitos (ver FMA1); `--frozen-lockfile`.
