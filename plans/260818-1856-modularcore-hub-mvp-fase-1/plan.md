---
title: "ModularCore Hub MVP Fase 1"
description: "Hub de componentes headless multi-proveedor con distribución propia: Registry HTTP estático + CLI + Media Picker + AI Chat + Website."
status: pending
priority: P1
effort: "6-8 semanas"
tags: [monorepo, sveltekit, registry, cli, headless, copy-code]
created: 2026-08-18
---

# ModularCore Hub MVP Fase 1

## Overview

Scaffold + implementación del MVP Fase 1 (§17 del PRD `modularcore-hub.md`).
Un **Registry HTTP como única fuente de verdad** (JSON/tarballs estáticos generados en build) y **clientes delgados** (Website, CLI). Componentes distribuidos como **copy-code** (código fuente copiado al proyecto del usuario, sin runtime del hub ni gestor obligatorio). **Sin auth ni DB** en este MVP (decisión de bootstrap). Fuente de verdad: PRD + informe `plans/reports/ak-research-260818-1238-prd-mejoras-report.md`.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Monorepo reproducible (pnpm+Turborepo+Changesets) con versionado semántico por paquete | P1 |
| 2 | Registry declarativo (§6) servido como estático + spike go/no-go de inyección copy-code | P1 |
| 3 | CLI propio (cliente delgado): init/add/list/search/update/diff, <5 min init→componente | P1 |
| 4 | Universal Media Picker: core headless + S3-compatible + Cloudinary + React/Svelte | P1 |
| 5 | AI Chat: core headless (OpenAI-compatible, streaming, tools, historial) + React/Svelte/Web | P1 |
| 6 | Website: catálogo + docs + playgrounds + endpoints del registry | P2 |

## Phases

| # | Phase | Depende de | Rama | Tag | Status |
|---|-------|-----------|------|-----|--------|
| 1 | [Monorepo Foundation](./phase-01-start.md) | — | `chore/0.1.0-monorepo-foundation` | `v0.1.0` | Pending |
| 2 | [Registry Schema and Build Spike](./phase-02-registry-schema-and-build-spike.md) | 1 | `feat/0.2.0-registry-schema-build-spike` | `v0.2.0` | Pending |
| 3 | [CLI Thin Client](./phase-03-cli-thin-client.md) | 2 | `feat/0.3.0-cli-thin-client` | `v0.3.0` | Pending |
| 4 | [Universal Media Picker](./phase-04-universal-media-picker.md) | 2 | `feat/0.4.0-universal-media-picker` | `v0.4.0` | Pending |
| 5 | [AI Chat](./phase-05-ai-chat.md) | 2 | `feat/0.5.0-ai-chat` | `v0.5.0` | Pending |
| 6 | [Website Catalog Docs Playgrounds](./phase-06-website-catalog-docs-playgrounds.md) | 2,4,5 | `feat/0.6.0-website-catalog-docs-playgrounds` | `v0.6.0` | Pending |

**Ruta crítica:** 1 → 2 (spike go/no-go, bloqueante) → {3, 4, 5 en paralelo} → 6.
Fases 3, 4 y 5 tienen ownership de archivos disjunto (`packages/cli`, `packages/media-picker`, `packages/ai-chat`) → paralelizables tras la Fase 2.

**Branching & releases:** cada fase se implementa en su rama, PR → `develop`; al completarla se corta release `develop → main` + tag `vX.Y.0` (minor por fase). `main` solo avanza por release. Detalle y reconciliación con el versionado por-componente (Changesets, §12) en [`docs/branching-release-strategy.md`](../../docs/branching-release-strategy.md). Nota: la paralelización de 3/4/5 implica integrar sus ramas en `develop` en el orden en que completen; el tag de cada una se corta al liberar esa fase.

## Non-Goals (contrato §9)

Auth/premium, PostgreSQL/Drizzle, MCP server, adaptadores Vue/Angular, Azure Blob,
snippets Blade/PHP, Auto-SEO, Auto-Translator, export shadcn, wireframes/diseño pulido,
extensión de navegador, hosting/transcodificación de media, UI estilizada.

## Success Criteria

- [ ] `pnpm install && pnpm build && pnpm test` verde en limpio y en CI.
- [ ] Spike Fase 2: componente de prueba servido por el registry se inyecta y corre en Vite+React **y** en Svelte (go/no-go documentado).
- [ ] `modularcore init && modularcore add media-picker` funciona end-to-end en <5 min.
- [ ] Media Picker: subida + recorte/compresión canvas contra S3-compatible (MinIO) y Cloudinary.
- [ ] AI Chat: streaming real vía OpenRouter con function calling y token counting.
- [ ] Website lista ≥2 componentes con docs y playgrounds funcionales; sirve `/registry/index.json`, `/registry/{name}.json`, `/registry/{name}.tar.gz`.
- [ ] Credenciales de terceros NUNCA en el registry; install genera/append `.env.example`.
- [ ] Changesets versiona por paquete; ningún archivo de código >1000 líneas.

<!-- slug: modularcore-hub-mvp-fase-1 -->
