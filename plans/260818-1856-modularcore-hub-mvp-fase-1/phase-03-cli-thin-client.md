---
title: "Phase 3: CLI Thin Client"
status: done
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
{ "registryUrl":"http://localhost:5173/registry",  // configurable; sin default de producción (deploy fuera de alcance, Validación S1)
  "framework":"react",
  "paths":{"components":"src/components","lib":"src/lib/modularcore"},
  "installed":{"media-picker":"1.0.0"} }
```
Deploy del registry **fuera de alcance** (§9): en dev apunta al servidor local (SvelteKit); el usuario configura `registryUrl` cuando exista un host público. (Validación S1)
Resolución de `target`: descriptor da `target` relativo; CLI lo re-mapea contra `paths` si aplica. `.env.example`: append idempotente (no duplica keys). Credenciales nunca se piden ni guardan.

**Guardas de seguridad/robustez (predict):**
- **Path clamp:** todo `target` resuelto DEBE quedar dentro del root del proyecto (cwd). Rechazar `..`/rutas absolutas que escapen → error claro (anti path-traversal).
- **Solo `.env.example`:** el CLI nunca lee ni escribe `.env` real (evita fugas). Genera/append únicamente `.env.example`.
- **Atomicidad/idempotencia:** `add` es re-ejecutable; ante fallo (npm o red) reporta qué se escribió y deja estado consistente (o revierte lo escrito). `update` crea backup `.orig` del archivo antes de sobreescribir, además del diff con confirmación.
- **Reutilización DRY:** la resolución de descriptor + escritura de `files` usa el **módulo compartido** definido en Fase 2 (el mismo del spike), no lógica duplicada.

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

- [x] `modularcore init` genera config correcta detectando framework.
- [x] `modularcore add hello-core` escribe archivos, instala deps, genera `.env.example`.
- [x] `registryDependencies` se resuelven recursivamente sin duplicar.
- [x] `update`/`diff` muestran cambios, backup `.orig` y piden confirmación por archivo.
- [x] `target` con `..` o fuera del root se rechaza; el CLI nunca toca `.env` real.
- [x] `add` interrumpido deja estado consistente / reporta lo escrito.
- [x] Tests verdes contra un registry local; init→componente <5 min.

## Red Team Hardening (aplicado)

- **SA2 — Instalación de deps segura:** `add` instala `dependencies` con **`--ignore-scripts` por defecto**; exige semver pin en el descriptor; valida cada paquete contra allowlist mantenida en el registry; muestra paquetes+versiones y **pide confirmación** antes de invocar el package manager. (Evita postinstall RCE / dependency-confusion.)
- **AD2 — Gate de compatibilidad de framework:** `add` rechaza con error explícito si el framework del proyecto ∉ `descriptor.frameworks`; además valida `peerDependencies` (versión instalada de React/Svelte) y **aborta antes de escribir** si no satisface el rango. `init` promptea selección ante ambigüedad (0/>1 frameworks, o cwd = root del workspace) en vez de adivinar.
- **AD7 — Entorno del CLI:** `package.json` del CLI declara `engines:{node:">=18"}`; fallo temprano con mensaje claro si `fetch` global no existe. KPI <5 min instrumentado separando tiempo de red/`npm install` del tiempo del CLI (o reformulado excluyendo el install).
- **FMA7 — Errores del registry-client:** detectar respuestas no-JSON/404 y emitir error accionable ("registry no generado: corre `pnpm build:registry`").

## Risk Assessment

- **Mantener CLI cuesta (§16)** → cliente delgado: 0 lógica de negocio; solo I/O + prompts.
- **Sobreescribir cambios del usuario** → confirmación archivo a archivo obligatoria en update; diff antes de tocar.
- **Package manager heterogéneo** → detectar por lockfile; fallback a npm.
- **Ciclos en registryDependencies** → detección + error claro.
