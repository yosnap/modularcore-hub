---
title: "Phase 3: CLI Thin Client"
status: todo
priority: P1
effort: "5-6d"
dependencies: [2]
---

# Phase 3: CLI Thin Client

## Overview

CLI propio `modularcore` (Node + Commander + Clack), **cliente delgado** sobre la API del registry: `init`, `add`, `list`, `search`, `update`, `diff`. Toda la lógica (versiones, deps, env vars) vive en el registry; el CLI solo consume y escribe archivos. Objetivo KPI: <5 min de `init` a componente funcionando.

## Requirements

- Funcional: `init` detecta framework (react/svelte/vue/angular por deps del package.json) y escribe `modularcore.json` de proyecto con `paths` (targets base) y `registryUrl`.
- Funcional: `add <name>` → fetch descriptor → resolver `registryDependencies` (recursivo) → instalar `dependencies` npm (detecta pnpm/npm/yarn/bun) → escribir `files[].content` al `target` → generar/append `.env.example` con `envVariables`.
- Funcional: `list` (index.json) y `search <q>` (filtro sobre index).
- Funcional: `update <name?>` re-inyecta archivos con **confirmación archivo a archivo** (diff visible antes de sobreescribir).
- Funcional: `diff <name>` muestra qué cambió entre local y la versión del registry.
- No funcional: cliente delgado (sin lógica de negocio duplicada), publicable en npm, cobertura de tests de las operaciones core, funciona sin bundler en el proyecto del usuario.

## Architecture

```
packages/cli/                 # @modularcore/cli (bin: modularcore)
├─ src/index.ts             # commander setup
├─ src/config.ts            # leer/escribir modularcore.json de proyecto
├─ src/registry-client.ts   # fetch index/descriptor/tarball (thin)
├─ src/framework-detect.ts  # detectar framework + package manager
├─ src/commands/{init,add,list,search,update,diff}.ts
├─ src/files.ts             # escribir/target-resolve, .env.example append
└─ src/prompts.ts           # Clack: confirmaciones, selects
```

`modularcore.json` de proyecto:
```jsonc
{ "registryUrl":"https://hub.../registry",
  "framework":"react",
  "paths":{"components":"src/components","lib":"src/lib/modularcore"},
  "installed":{"media-picker":"1.0.0"} }
```
Resolución de `target`: descriptor da `target` relativo; CLI lo re-mapea contra `paths` si aplica. `.env.example`: append idempotente (no duplica keys). Credenciales nunca se piden ni guardan.

## Related Code Files

- Create: `packages/cli/{package.json,tsconfig.json,src/index.ts,src/config.ts,src/registry-client.ts,src/framework-detect.ts,src/files.ts,src/prompts.ts}`
- Create: `packages/cli/src/commands/{init,add,list,search,update,diff}.ts`
- Create: `packages/cli/test/*` (fixtures de registry local + proyecto temporal)
- Reuse: tipos del descriptor desde `@modularcore/registry` (schema).

## Implementation Steps

1. Bootstrap `packages/cli` con Commander + Clack; `bin` = `modularcore`.
2. `registry-client.ts`: `getIndex()`, `getDescriptor(name)`, opcional `getTarball(name)`.
3. `framework-detect.ts`: inspeccionar `package.json` del cwd (react/svelte/...) + package manager (lockfile).
4. `init`: detectar + prompts Clack para confirmar paths → escribir `modularcore.json`.
5. `add`: resolver registryDependencies (topo-sort, evitar ciclos), instalar npm deps, escribir files, append `.env.example`, actualizar `installed`.
6. `list`/`search` sobre index.json.
7. `diff`: comparar contenido local vs descriptor (por archivo). `update`: aplicar con confirmación archivo a archivo (Clack).
8. Tests: registry local (de Fase 2) + proyecto temporal → `init`+`add hello-core` end-to-end; medir tiempo (<5 min manual, asserts de archivos escritos).

## Success Criteria

- [ ] `modularcore init` genera config correcta detectando framework.
- [ ] `modularcore add hello-core` escribe archivos, instala deps, genera `.env.example`.
- [ ] `registryDependencies` se resuelven recursivamente sin duplicar.
- [ ] `update`/`diff` muestran cambios y piden confirmación por archivo.
- [ ] Tests verdes contra un registry local; init→componente <5 min.

## Risk Assessment

- **Mantener CLI cuesta (§16)** → cliente delgado: 0 lógica de negocio; solo I/O + prompts.
- **Sobreescribir cambios del usuario** → confirmación archivo a archivo obligatoria en update; diff antes de tocar.
- **Package manager heterogéneo** → detectar por lockfile; fallback a npm.
- **Ciclos en registryDependencies** → detección + error claro.
