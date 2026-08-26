---
phase: 4
title: "Registry Descriptors, Docs & Release"
status: done
priority: P2
effort: "2-3d"
dependencies: [2, 3]
---

# Phase 4: Registry Descriptors, Docs & Release

## Overview

Cierre de la sub-fase: publica `@modularcore/auto-seo` como componente instalable en el registry (descriptor `modularcore.json`), documenta ambos paquetes nuevos, y prepara el versionado/branching siguiendo la misma convención del MVP Fase 1 (`docs/branching-release-strategy.md`).

## Requirements

- Funcional:
  - [x] `packages/auto-seo/modularcore.json` válido contra `packages/registry/src/schema.zod.ts`, con `"frameworks": ["agnostic"]` (`<!-- Updated: Validation Session 1 -->`), visible en `/registry/index.json` tras `pnpm build:registry`.
  - [x] `@modularcore/mcp-server` **no** lleva `modularcore.json` de componente instalable (se distribuye como paquete npm ejecutable, no como copy-code) — pero `<!-- Updated: Validation Session 1 -->` **SÍ se lista en el catálogo del website** con una página de docs/uso propia (ver Related Code Files e Implementation Steps abajo).
  - [x] Changesets creados para los 3 paquetes nuevos/modificados (`registry-client`, `auto-seo`, `mcp-server`) + el bump correspondiente de `cli` si su `package.json` cambió.
  - [x] READMEs de `auto-seo` y `mcp-server` con ejemplos de uso reales (no placeholders).
- No-funcional:
  - [x] Rama y tag siguen el formato `feat/{semver}-{slug}` → PR a `develop` → tag `vX.Y.0` al liberar, igual que las fases del MVP.

## Related Code Files

- Create: `packages/auto-seo/modularcore.json`
- Create/Modify: `.changeset/*.md` (uno por paquete afectado, generado con `pnpm changeset`, no a mano)
- Modify: `packages/auto-seo/README.md` (completar ejemplos si Fase 2 dejó placeholders)
- Modify: `packages/mcp-server/README.md` (completar ejemplos si Fase 3 dejó placeholders)
- Verify (no modificar si no hace falta): `turbo.json`, `.changeset/config.json` — confirmar que ningún paquete nuevo requiere entrar en `ignore`
- `<!-- Updated: Validation Session 1 -->` **Página de docs del MCP server en el website (NO vía el mecanismo de registry):**
  - Create: `apps/web/src/routes/mcp-server/+page.svelte` (contenido estático basado en `packages/mcp-server/README.md` — instalación, tools disponibles, config `mcpServers` para Cursor/Claude Code/VS Code). Ruta separada de `/c/[name]` porque esa ruta es 100% data-driven desde `registry-data/index.json` (`apps/web/src/routes/c/[name]/+page.svelte`) y el MCP server deliberadamente no tiene `modularcore.json` — no debe fingirse un descriptor de registry solo para reusar esa ruta.
  - Modify: `apps/web/src/routes/+page.svelte` — añadir una sección separada (ej. "Herramientas") con un link a `/mcp-server`, fuera del `{#each data.components as component}` que itera `registry-data/index.json` (ese loop sigue siendo solo para componentes copy-code reales).

## Implementation Steps

1. Escribir `packages/auto-seo/modularcore.json` siguiendo el shape verificado de `packages/media-picker/modularcore.json` (`name`, `version`, `title`, `type: "headless-core"`, `category: "seo"`, `frameworks: ["agnostic"]`, `visibility: "public"`, `dependencies`, `envVariables: []`, `files[]` apuntando a `core/*.ts`).
2. Validar el descriptor contra `packages/registry/src/schema.zod.ts` (test o script existente de validación del registry, si lo hay — revisar `packages/registry/test/` antes de escribir uno nuevo).
3. `pnpm build:registry` y confirmar que `auto-seo` aparece en `/registry/index.json` con los mismos campos que Media Picker/AI Chat.
4. Crear `apps/web/src/routes/mcp-server/+page.svelte` con el contenido de `packages/mcp-server/README.md` (instalación, tools, config de clientes MCP).
5. Añadir una sección "Herramientas" en `apps/web/src/routes/+page.svelte` con link a `/mcp-server`, separada del loop que itera `data.components` (ese loop es solo para entradas reales de `registry-data/index.json`).
6. `pnpm changeset` para cada paquete nuevo/modificado (no editar `.changeset/*.md` a mano).
7. Completar READMEs con ejemplos reales copiados de los tests ya escritos en Fases 2/3 (evita ejemplos que no compilan).
8. Sweep final: releer `plan.md` + las 4 fases y confirmar que no quedan referencias a decisiones descartadas.

## Success Criteria

- [x] `pnpm build:registry` incluye `auto-seo` en el índice sin errores de validación de schema, con `frameworks: ["agnostic"]`.
- [x] `/mcp-server` en el website renderiza la página de docs (instalación + tools + config de clientes MCP), enlazada desde una sección propia en la home, sin aparecer en el loop de componentes del registry.
- [x] `pnpm changeset status` muestra los paquetes correctos con el bump esperado (minor para paquetes nuevos).
- [x] READMEs no tienen placeholders (`_TBD_`, `Describe...`) ni ejemplos que no compilan.
- [x] Rama de esta sub-fase nombrada según convención (siguiente minor libre tras `v0.8.2`, es decir `v0.9.0` — confirmar contra `git tag --list` en el momento de implementar por si hubo releases intermedios).

## Risk Assessment

- **Riesgo:** versionado de Changesets con `updateInternalDependencies: "patch"` podría forzar un bump de `cli`/`registry` no deseado solo por la nueva dependencia workspace. **Mitigación:** revisar `pnpm changeset status` antes de mergear, no asumir que el bump automático es correcto.
- **Riesgo:** la nueva sección "Herramientas" de la home podría confundirse visualmente con el catálogo de componentes instalables. **Mitigación:** dejar explícito en el copy de esa sección que el MCP server se instala vía `npx`/config de cliente MCP, no vía CLI/copy-code.
