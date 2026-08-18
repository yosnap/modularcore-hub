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
| 1 | [Monorepo Foundation](./phase-01-start.md) | — | `chore/0.1.0-monorepo-foundation` | `v0.1.0` | Done |
| 2 | [Registry Schema and Build Spike](./phase-02-registry-schema-and-build-spike.md) | 1 | `feat/0.2.0-registry-schema-build-spike` | `v0.2.0` | Done |
| 3 | [CLI Thin Client](./phase-03-cli-thin-client.md) | 2 | `feat/0.3.0-cli-thin-client` | `v0.3.0` | Done |
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

## Validation Log

### Sesión 1 — 2026-08-18 (validate)

**Verification (greenfield):** repo sin código previo; todas las claims son "Create". Verificación grep/glob contra código existente N/A. Claims checked: 0 sobre existente · Failed: 0. Tier: Full (5+ fases) → no aplicable por greenfield.

Decisiones confirmadas (interview, 6 preguntas):

1. **AI Chat token counting** → estimación ligera (heurística char/token) + `usage` real del provider. **Sin** tokenizer BPE pesado. Afecta Fase 5.
2. **Media Picker S3 upload** → provider construido con hook `getUploadUrl(file)` contra el backend del usuario (presigned); incluir en docs un **snippet de referencia** del endpoint firmante. Secret keys nunca en el core (browser). Afecta Fase 4.
3. **Deploy del registry** → **fuera de alcance** (§9). El plan entrega el registry funcionando en dev (local). CLI usa `registryUrl` configurable en `modularcore.json`; sin default de producción hasta que haya dominio/deploy. Afecta Fase 3.
4. **Naming npm** → `@modularcore/{cli,media-picker,ai-chat,registry}` + binario `modularcore`. Asume scope `@modularcore` disponible. Afecta Fases 1/3/4/5.
5. **Test runner** → **Vitest** (workspace mode, jsdom para DOM/canvas, soporta React+Svelte). Afecta Fase 1 + todos los pasos de test.
6. **Smoke tests externos** → **REQUERIDOS en CI** (decisión del usuario; no la opción por defecto). Unit tests con mocks siempre + smokes reales obligatorios. Implicación: CI necesita **secretos** (MinIO como servicio docker de CI; `CLOUDINARY_*`; `OPENROUTER_API_KEY`). Sin ellos, CI falla (comportamiento buscado). Afecta Fases 1, 4, 5.

### Whole-Plan Consistency Sweep — Sesión 1
Propagadas las 6 decisiones a phase-01/03/04/05. Sin términos obsoletos ni contradicciones: el hook `getUploadUrl` ya estaba en Fase 4 (red-team); `registryUrl` configurable ya en Fase 3; deploy ya en non-goals. Sin conflictos sin resolver.

### Predict (5 personas) — 2026-08-18 · Verdict: CAUTION (sin bloqueantes)
Adiciones accionables aplicadas al plan:
1. **Naturaleza dual de paquetes** (Fase 2/4/5): cada componente = paquete importable (`exports`+build) **y** copy-code source, mismo origen.
2. **Guardas del CLI** (Fase 3): path clamp de `target` al root (anti path-traversal), solo `.env.example`, `add` idempotente/resumable, backup `.orig` en `update`.
3. **Hardening proxy chat** (Fase 6): tools deshabilitados, cap de tokens, allowlist de modelos, rate-limit, streaming passthrough real.
4. **DRY spike↔CLI** (Fase 2/3): módulo compartido resolve+write.
5. **Integridad** (Fase 2, opcional/nota): hash por archivo en descriptor — no bloqueante en MVP.

## Red Team Review

### Sesión — 2026-08-18 (4 revisores hostiles)
**Findings:** 27 (19 Accept técnicos aplicados, 8 dispuestos por decisión del usuario). **Severidad:** 3 Critical, 15 High, 9 Medium.
Detalle completo: [`plans/reports/from-red-team-to-planner-adversarial-review-260818-1941-modularcore-mvp-fase-1-report.md`](../reports/from-red-team-to-planner-adversarial-review-260818-1941-modularcore-mvp-fase-1-report.md).

**Grupo A — Hardening técnico ACEPTADO y aplicado:**

| # | Sev | Finding | Aplicado a |
|---|-----|---------|-----------|
| SA1 | Crit | Clamp del `path` en el builder (anti exfiltración de secretos al registry público) | Fase 2 |
| AD1 | Crit | `peerDependencies`/versión de framework en schema + gate en `add` | Fase 2/3 |
| SA2 | High | `add --ignore-scripts` + pin + allowlist + confirmación | Fase 3 |
| SA3 | High | Secretos de CI: unit en forks, smokes con secretos solo en push a protegidas | Fase 1 |
| SA4 | High | Validar args de `tool_calls` + hook confirm en el core | Fase 5 |
| FMA1 | High | Turbo declara outputs/inputs del registry | Fase 1/2 |
| FMA2 | High | `visibility:internal` excluye `hello-core` del índice | Fase 2 |
| FMA3 | High | `changeset version` repo-wide → versionar por paquete al mergear / serializar | branching-doc |
| FMA5 | High | Coordinación de `pnpm-lock.yaml` en merges paralelos | Fase 1 |
| AD2 | High | Gate `descriptor.frameworks ∩ detectado`; `init` promptea ambigüedad | Fase 3 |
| AD3 | High | `encoding: utf8\|base64` por archivo | Fase 2 |
| AD4 | High | Claim OpenAI-compat degradada + normalización usage/tool_calls + 2º smoke | Fase 5 |
| AD5 | High | Contrato de wire del historial backend (Message zod + HTTP + contract-test) | Fase 5 |
| AD6 | High | Tests de canvas reales (browser-mode), no phantom en jsdom | Fase 4 |
| FMA6 | Med | Emisión atómica del registry + validación post-build | Fase 2 |
| FMA7 | Med | `predev build:registry` + errores accionables del registry-client | Fase 2/3 |
| SA5 | Med | Guardas SSRF en fuente "URL remota" | Fase 4 |
| SA6 | Med | Cloudinary firmado por defecto | Fase 4 |
| AD7 | Med | `engines:node>=18` + guard `fetch` + KPI instrumentado | Fase 3 |

**Grupo B — Alcance/decisiones: RECHAZADOS por el usuario (se honra la decisión explícita):**

| # | Sev | Finding | Disposición |
|---|-----|---------|-------------|
| SC1 | Crit | Cortar a slice vertical único (solo Media Picker) | **Reject** — usuario mantiene ambos flagship completos |
| SC2 | High | Diferir `tools.ts` a v1.1 | **Reject** — AI Chat completo |
| SC3/FMA4 | High | Smokes CI no-bloqueantes | **Reject** — usuario mantiene bloqueantes (S1); SA3 sí aplicado |
| SC4 | Med | Historial local-only + quitar adaptador vanilla Web | **Reject** — alcance completo |
| SC5 | Med | Quitar "biblioteca" + "presets por rol" del Media Picker | **Reject** — alcance completo |
| SC6 | Med | Cortar `search` del CLI | **Reject** — alcance completo |
| SC7 | Med | `type` unión cerrada (sin agent-tool) | **Reject** — mantener extensible (PRD §6) |

### Whole-Plan Consistency Sweep — Red Team
Aplicados 19 hardening a fases 1-5 + branching-doc, en secciones "Red Team Hardening" y schema del descriptor (⊕). Sin contradicciones: los campos nuevos (`visibility`, `peerDependencies`, `encoding`) se reflejan en el schema de Fase 2 y los consume Fase 3; SA3 mantiene smokes bloqueantes en push (compatible con decisión S1). Grupo B rechazado no altera el plan. Sin conflictos sin resolver.

<!-- slug: modularcore-hub-mvp-fase-1 -->
