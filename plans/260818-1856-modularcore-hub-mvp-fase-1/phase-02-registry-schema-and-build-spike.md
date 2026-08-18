---
title: "Phase 2: Registry Schema and Build Spike"
status: todo
priority: P1
effort: "4-5d"
dependencies: [1]
---

# Phase 2: Registry Schema and Build Spike

## Overview

Define el **schema declarativo del registry** (§6) y el **pipeline que lo genera como estático** (index.json + {name}.json + {name}.tar.gz). Incluye un **componente de prueba trivial** y un **script inyector** que lo copia a una app Vite+React y a una Svelte: es el **hito bloqueante go/no-go** de Fase 0 (§17) que de-risquea la arquitectura copy-code antes de construir componentes reales.

## Requirements

- Funcional: tipos TS + validación (zod) del descriptor `{name}.json` con todos los campos de §6.
- Funcional: build script que escanea `packages/*` con descriptor, valida, y emite estáticos a `apps/web/static/registry/` (o `build/registry/`): `index.json`, `{name}.json` (descriptor + **contenido de archivos inline**), `{name}.tar.gz`.
- Funcional: endpoints servidos por SvelteKit (o adapter-static): `GET /registry/index.json|{name}.json|{name}.tar.gz`.
- Funcional: componente de prueba `hello-core` (`type: headless-core`, sin providers) para probar el pipeline sin depender de Media Picker/AI Chat.
- Funcional: `scripts/inject-spike.mjs` — dado el registry local, resuelve `hello-core` y escribe sus `files` al `target` en apps de prueba React (Vite) y Svelte.
- No funcional: registry servible como JSON estático (hosting barato/CDN). Credenciales NUNCA en el registry.

## Architecture

```
packages/registry/           # @modularcore/registry — schema + builder (NO cliente)
├─ src/schema.ts            # tipos TS del descriptor
├─ src/schema.zod.ts        # validación runtime (zod)
├─ src/build-registry.ts    # scan packages → validar → emitir estáticos
└─ src/tarball.ts           # empaquetar files → .tar.gz

packages/hello-core/         # componente de prueba
├─ modularcore.json         # descriptor
└─ src/hello.ts             # 1 archivo trivial (headless-core)

apps/web/static/registry/    # salida generada (git-ignored, build artifact)
scripts/inject-spike.mjs     # spike de inyección → fixtures/vite-react, fixtures/svelte
fixtures/                     # apps mínimas destino del spike (React+Vite, Svelte)
```

Descriptor (§6) validado por zod:
```jsonc
{ "name","version","title","type","category","frameworks",
  "dependencies":[], "registryDependencies":[],
  "envVariables":[{"key","description","required"}],
  "files":[{"path","target","type"}] }
```
`type ∈ {frontend-component, headless-core, snippet}` (extensible a `agent-tool`).
`index.json` = array resumido (name,title,category,version,frameworks,description).
`{name}.json` = descriptor completo con `files[].content` inline (para copy-code sin descomprimir).

## Related Code Files

- Create: `packages/registry/{package.json,tsconfig.json,src/schema.ts,src/schema.zod.ts,src/build-registry.ts,src/tarball.ts}`
- Create: `packages/hello-core/{package.json,modularcore.json,src/hello.ts}`
- Create: `scripts/inject-spike.mjs`
- Create: `fixtures/vite-react/*`, `fixtures/svelte/*` (apps mínimas)
- Create: `apps/web/` base SvelteKit (skeleton), ruta de servir registry estático
- Modify: `turbo.json` (task `build:registry` antes de `build` de web)

## Implementation Steps

1. `packages/registry`: definir `schema.ts` + `schema.zod.ts` con todos los campos de §6.
2. `build-registry.ts`: glob `packages/*/modularcore.json` → validar con zod → leer `files[].path` → emitir `index.json` + `{name}.json` (content inline) + `{name}.tar.gz`.
3. `hello-core`: descriptor + 1 archivo `src/hello.ts`; registrar en el build.
4. Skeleton `apps/web` (SvelteKit 5) + servir `static/registry/*` (o ruta `+server.ts` que lee build output).
5. `inject-spike.mjs`: fetch `index.json` + `hello-core.json` desde el registry local → escribir `files[].content` a `target` en `fixtures/vite-react` y `fixtures/svelte`.
6. Correr ambos fixtures: importar el componente inyectado y ejecutar → verificar que compila y corre en Vite+React y en Svelte.
7. **Go/no-go**: documentar resultado del spike en `plans/reports/` (report de fase). Si no-go, parar y reevaluar arquitectura antes de fases 3-6.

## Success Criteria

- [ ] Descriptor inválido falla el build con error claro (zod).
- [ ] `pnpm build:registry` emite `index.json`, `hello-core.json`, `hello-core.tar.gz`.
- [ ] Endpoints devuelven los 3 recursos con content-type correcto.
- [ ] `hello-core` inyectado compila y corre en Vite+React **y** en Svelte.
- [ ] Report go/no-go escrito con evidencia (comandos + salida).

## Risk Assessment

- **Resolución de paths en targets raros (monorepos)** → `target` explícito por archivo en el descriptor; el spike prueba el caso base.
- **content inline vs tarball divergen** → una sola fuente (`files[]`); tarball se genera de lo mismo.
- **NO-GO real (copy-code no encaja)** → es el propósito del gate; barato descubrirlo aquí antes de invertir en componentes.
