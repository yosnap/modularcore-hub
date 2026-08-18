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
- No funcional: Node ≥20, pnpm ≥9. `.env.example` raíz. `.gitignore` correcto (node_modules, .turbo, dist, .svelte-kit, .env).
- No funcional: ningún archivo de config supera límites razonables; TS `strict: true`.

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
6. ESLint flat config + Prettier + scripts raíz (`lint`, `format`, `typecheck`).
7. CI: workflow que corre `pnpm install --frozen-lockfile` + `pnpm turbo build test typecheck lint`.
8. `README.md` raíz con quickstart. Verificar `pnpm install && pnpm build` (sin paquetes aún = no-op verde).

## Success Criteria

- [ ] `pnpm install --frozen-lockfile` reproducible.
- [ ] `pnpm turbo build test typecheck lint` verde (aunque vacío).
- [ ] `pnpm changeset` crea un changeset de prueba correctamente.
- [ ] CI verde en un PR trivial.

## Risk Assessment

- **Config drift entre paquetes** → `tsconfig.base.json` heredado por todos; ESLint flat config única en raíz.
- **Caché Turbo inválida en CI** → declarar `outputs`/`inputs` explícitos; `--frozen-lockfile`.
