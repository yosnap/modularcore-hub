---
title: "ModularCore Hub v1.1 (Fase 2, parte A) - Auto-SEO & MCP Server"
description: "Dos componentes nuevos del roadmap v1.1: Auto-SEO/JSON-LD headless + MCP server propio sobre el Registry HTTP existente."
status: done
priority: P1
effort: "3-4 semanas"
tags: [monorepo, mcp, seo, registry, headless]
blockedBy: []
blocks: []
created: 2026-08-25
---

# ModularCore Hub v1.1 (Fase 2, parte A) — Auto-SEO & MCP Server

## Overview

Continuación del roadmap post-MVP (§5 v1.1 y §7 del PRD `modularcore-hub.md`). El MVP Fase 1 está **completo y en producción** (v0.8.2): Registry HTTP, CLI, Media Picker, AI Chat, Website. Este plan cubre **solo 2 de los 6 items de v1.1** (decisión del usuario, alcance reducido): **Auto-SEO & OpenGraph** (alcance MVP: solo JSON-LD) y **MCP server propio**. Adaptadores Vue/Angular, Azure Blob provider y snippets Blade/PHP quedan fuera de este plan (siguiente iteración).

Ambos componentes nuevos siguen el patrón ya establecido por Media Picker/AI Chat: paquete en `packages/`, `modularcore.json` descriptor servible por el registry, Changesets, Vitest, sin DB/auth nuevos. El MCP server reutiliza la lógica de `packages/cli/src/registry-client.ts` en vez de duplicarla — por eso la Fase 1 extrae esa lógica a un paquete compartido antes de construir el MCP server.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Extraer `registry-client` de `packages/cli` a paquete compartido `@modularcore/registry-client`, sin romper el CLI | P1 |
| 2 | Auto-SEO: core headless framework-agnóstico para generar JSON-LD (Schema.org) validado con Zod | P1 |
| 3 | MCP server (`@modelcontextprotocol/sdk`, stdio) con tools `search_components`/`get_component`/`install_component`/`check_updates` sobre el Registry HTTP existente | P1 |
| 4 | Descriptores de registry + docs + Changesets para ambos paquetes nuevos, consistentes con convenciones del MVP | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Registry Client Compartido](./phase-01-start.md) | Done |
| 2 | [Auto-SEO JSON-LD Core](./phase-02-registry-client-compartido.md) | Done |
| 3 | [MCP Server](./phase-03-auto-seo-json-ld-core.md) | Done |
| 4 | [Registry Descriptors, Docs & Release](./phase-04-mcp-server.md) | Done |

**Ruta crítica:** 1 (bloqueante para 3) → {2, 3 en paralelo tras la 1} → 4.
Nota: los nombres de archivo conservan el slug generado por `ak plan create`/`add-phase`; el título y contenido de cada fase son la fuente de verdad (ver tabla de arriba).

## Non-Goals (este plan, no del roadmap completo)

Adaptadores Vue/Angular, Azure Blob provider, snippets Blade/PHP (quedan en v1.1 pendiente), Social Card preview / keywords del Auto-SEO (fase posterior del mismo componente, no MVP de este plan), transporte HTTP/SSE remoto del MCP server (solo stdio local), auth/DB nuevos, deploy del registry a producción.

## Success Criteria

- [x] `pnpm install && pnpm build && pnpm test` verde en limpio (incluye los 3 paquetes nuevos/modificados).
- [x] CLI (`packages/cli`) sigue funcionando idéntico tras migrar a `@modularcore/registry-client` (sin cambios de comportamiento observable).
- [x] `@modularcore/auto-seo`: genera JSON-LD válido (Article, Product, Organization, BreadcrumbList, WebSite, LocalBusiness, FAQPage) y pasa validación Zod (test explícito de escapado `<` en `stringify`) en tests.
- [x] `@modularcore/mcp-server`: conecta por stdio (spike GO contra SDK 1.30.0 real vía `InMemoryTransport`), expone las 4 tools y `install_component` pide confirmación explícita (elicitation) antes de escribir archivos.
- [x] `@modularcore/auto-seo` publica `modularcore.json` válido contra `packages/registry/src/schema.zod.ts` y aparece en `/registry/index.json` tras `pnpm build:registry` (`@modularcore/mcp-server` no lleva descriptor por decisión de Validación Sesión 1 — se lista en `/mcp-server` del website en su lugar).
- [x] Changesets versiona los 3 paquetes nuevos (minor) + `cli` (patch); ningún archivo de código >1000 líneas.
- [x] Credenciales de terceros NUNCA en el registry (no aplica secretos nuevos en este plan, se mantiene el invariante).

## Research Log

- **Auto-SEO/JSON-LD** (researcher, 2026-08-25): API mínima recomendada = `createSchema(type, props)`, `createGraph(...schemas)`, `stringify(schema, {absolute})`, `validate(jsonld)`. Usar tipos de `schema-dts` (Google, solo tipos, sin runtime) + validación runtime con Zod. Funciones puras, sin métodos encadenables, para mantener agnosticismo de framework. Escapado de JSON-LD embebido se delega a `JSON.stringify()` nativo. Fuentes: https://github.com/google/schema-dts, https://github.com/jdevalk/seo-graph, https://www.w3.org/TR/json-ld11/.
- **MCP server** (researcher, 2026-08-25): transporte **stdio** (no SSE, deprecado) para paquete npm instalable localmente. Tools definidos con `registerTool` + Zod schemas (`.describe()` es crítico para que el LLM infiera argumentos). `install_component` (operación destructiva de escritura) requiere **elicitation** explícita antes de escribir — el protocolo la soporta, mostrar ruta destino/versión/deps antes de confirmar. Testing sin cliente real vía `InMemoryTransport.createLinkedPair()` en Vitest. Arquitectura recomendada: MCP como thin adapter sobre una lib de registry-client compartida, no reimplementar lógica del CLI. Fuentes: https://github.com/modelcontextprotocol/typescript-sdk, https://modelcontextprotocol.io/specification/draft/client/elicitation, https://ts.sdk.modelcontextprotocol.io/v2/testing.html.
  **Corrección post red-team (2026-08-25):** el research original afirmaba erróneamente `@modelcontextprotocol/sdk` "v2". Verificado con `npm view @modelcontextprotocol/sdk versions`: la última versión publicada es **1.30.0**, no existe v2. Toda referencia a "v2" en este plan es incorrecta — ver Fase 3 corregida.
- **Convenciones del repo** (scout, 2026-08-25): confirmado por lectura directa — `packages/cli/src/registry-client.ts` exporta `RegistryClient` (interfaz) + `createRegistryClient(registryUrl)`, usa `registryEntrySchema`/`registryIndexEntrySchema` de `@modularcore/registry` y `RegistryClientError`. `packages/registry/src/schema.zod.ts`: `componentTypeSchema` = `'frontend-component' | 'headless-core' | 'snippet'` (extensible vía `z.union`), `frameworks` = array de strings libre (no enum cerrado), `visibility` = `'public' | 'internal'`, rutas de archivo validadas contra path traversal (`safeRelativePathSchema`). `turbo.json`: tareas `build`/`typecheck`/`test` con `dependsOn: ["^build", ...]` — un paquete nuevo hereda el pipeline sin cambios si no genera artefactos del registry. `.changeset/config.json`: `access: "public"`, `ignore: ["web", "@modularcore/hello-core"]` (apps/paquetes internos no publicados) — los paquetes nuevos NO deben añadirse a `ignore` si se publican en npm como `@modularcore/*`.

## Unresolved Questions

Ninguna — las 3 preguntas abiertas tras el red-team se resolvieron en `/ak:plan validate` (ver `## Validation Log`).

## Validation Log

### Sesión 1 — 2026-08-25 (validate, 3 preguntas)

1. **Distribución de `@modularcore/mcp-server`** → SE LISTA en el catálogo del website (no solo `npx`), con página de docs/uso, aunque no sea copy-code instalable vía CLI. Afecta Fase 3 (README fuente) y Fase 4 (nueva página en `apps/web`).
2. **`frameworks` del descriptor de `@modularcore/auto-seo`** → `["agnostic"]`. Afecta Fase 4 (`modularcore.json`).
3. **`schema-dts` en `@modularcore/auto-seo`** → `devDependency` (solo tipos, sin runtime; evita que el CLI lo instale como dependencia de producción al hacer `add`). Afecta Fase 2.

### Whole-Plan Consistency Sweep — Validación
Propagadas las 3 decisiones a Fase 2, 3 y 4 (ver marcadores `<!-- Updated: Validation Session 1 -->` en cada fase). Sin términos obsoletos ni contradicciones: la decisión de listar el MCP server en el website no reintroduce un `modularcore.json` de componente instalable (sigue sin llevarlo, solo gana una página de docs). Sin conflictos sin resolver.

## Red Team Review

### Sesión — 2026-08-25 (3 revisores hostiles: Security Adversary, Failure Mode Analyst, Assumption Destroyer)

**Findings:** 10 únicos tras deduplicar (de 20 brutos entre los 3 revisores). **Severidad:** 2 Critical, 2 High, 6 Medium. **Disposición:** 10 Accept, 0 Reject (los 3 revisores citaron evidencia `file:line` real; ningún finding fue evidence-free).

| # | Finding | Severidad | Disposición | Aplicado a |
|---|---------|-----------|-------------|------------|
| 1 | `RegistryClientError extends CliError` rompe `instanceof CliError` del CLI al mover el archivo (stack trace en vez de mensaje limpio) | Critical | Accept | Fase 1 |
| 2 | Plan afirmaba `@modelcontextprotocol/sdk` "v2" — no existe, última versión real 1.30.0 | Critical | Accept | Fase 3, Research Log |
| 3 | Lógica real de clamp/escritura (`resolveTargetPath`/`writeFilesTracked`) no se extrae en Fase 1 pese a que Fase 3 lo asumía | High | Accept | Fase 1, Fase 3 |
| 4 | Falta spike de verificación de elicitation + test para cliente MCP sin soporte de elicitation | High | Accept | Fase 3 |
| 5 | Escapado XSS de `</script>` en JSON-LD dejado como "descúbrelo con un test" | Medium | Accept | Fase 2 |
| 6 | "Convención de env var del CLI" para `registryUrl` no existe (CLI usa solo config de archivo) | Medium | Accept | Fase 3 |
| 7 | Sin plan de rollback si el smoke test de Fase 1 falla tras borrar el archivo original | Medium | Accept | Fase 1 |
| 8 | Lectura de `.env.example` para el preview de elicitation necesita el mismo guard anti-traversal que la escritura | Medium | Accept | Fase 3 |
| 9 | Sin definición de concurrencia/lifetime del `RegistryClient` singleton en el MCP server | Medium | Accept | Fase 3 |
| 10 | Contradicción: Unresolved Question sobre Changesets `ignore` vs. instrucción ya firme en Fase 1 | Medium | Accept | Este plan.md (resuelto arriba) |

### Whole-Plan Consistency Sweep
- Archivos releídos: `plan.md`, `phase-01-start.md`, `phase-02-registry-client-compartido.md`, `phase-03-auto-seo-json-ld-core.md`, `phase-04-mcp-server.md`.
- Deltas de decisión verificados: 10 (tabla arriba).
- Referencias obsoletas reconciliadas: eliminado "v2" del SDK en Research Log y Fase 3; eliminada la falsa afirmación de "convención ya usada por el CLI" para env vars; resuelta la pregunta abierta de Changesets `ignore` (era contradictoria con Fase 1).
- Contradicciones sin resolver: 0.

<!-- slug: modularcore-hub-v11-auto-seo-y-mcp-server -->