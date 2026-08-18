---
from: fullstack-developer
to: planner
date: 2026-08-18 20:38
subject: Fase 2 — Registry schema + build spike — resultado GO
---

# Resultado: GO

El pipeline copy-code (schema → build-registry → tarball → inject-spike → fixtures) compila,
valida y ejecuta correctamente en React (Vite) y Svelte. No se detectó ningún bloqueo
arquitectónico. Se documentan 2 hallazgos menores (no bloqueantes) al final.

## Evidencia — comandos y salida real

### 1. Build + test de `@modularcore/registry`

```
$ pnpm --filter @modularcore/registry build
$ tsc -p tsconfig.json
(sin errores)

$ pnpm --filter @modularcore/registry test
 ✓ test/resolve-write.test.ts (4 tests) 4ms
 ✓ test/tarball.test.ts (1 test) 2ms
 ✓ test/schema.zod.test.ts (10 tests) 4ms
 ✓ test/build-registry.test.ts (5 tests) 26ms
 Test Files  4 passed (4)
      Tests  20 passed (20)
```

Casos cubiertos: validación zod válido/inválido, rechazo de path traversal (`..`, absolutas,
Windows), rechazo de `encoding` inválido, rechazo de `name` no kebab-case, build end-to-end
contra fixtures (`public-widget` público + `internal-hello` interno), exclusión de
`visibility:internal` del índice, reemplazo atómico de un `outputDir` preexistente (no
merge), fallo con mensaje claro ante descriptor inválido, y fallo ante symlink que escapa
del root del paquete (defensa en profundidad más allá del rechazo zod de `..`).

### 2. `pnpm build:registry` (turbo, raíz)

```
$ pnpm build:registry
@modularcore/registry:build: $ tsc -p tsconfig.json
web:build:registry: $ node scripts/build-registry.mjs
web:build:registry: [build:registry] wrote 1 component(s) to .../apps/web/static/registry
web:build:registry: [build:registry] public index: (none)
 Tasks:    2 successful, 2 total
```

`apps/web/static/registry/` generado:
```
hello-core.json   (813 bytes, descriptor completo con files[].content inline en utf8)
hello-core.tar.gz (267 bytes, tarball real gzip+tar válido)
index.json        -> [] (hello-core es visibility:"internal" y queda correctamente EXCLUIDO)
```

### 3. Descriptor inválido falla el build con error claro

Cubierto por test `build-registry.test.ts > fails with a clear error when a descriptor is
invalid` — un `modularcore.json` con solo `{"name":"broken"}` produce:
`Invalid descriptor .../modularcore.json: <detalle zod>` y el build se detiene sin escribir
salida parcial (atomicidad vía directorio temporal + `rename`).

### 4. `pnpm build` (turbo, monorepo completo)

```
$ pnpm build
@modularcore/hello-core:build: $ tsc -p tsconfig.json
@modularcore/registry:build: $ tsc -p tsconfig.json
web:build:registry: [build:registry] wrote 1 component(s) ...
web:build: $ vite build
web:build: > Using @sveltejs/adapter-static
web:build:   Wrote site to "build"
 Tasks:    4 successful, 4 total
```

`apps/web/build/registry/` contiene los 3 archivos (index.json, hello-core.json,
hello-core.tar.gz) copiados verbatim por `adapter-static` — confirma que el registry es
servible como estático puro (sin servidor Node en producción).

### 5. Content-type de los 3 endpoints (servidor estático plano, sin dev-server)

```
GET /registry/index.json      -> 200, Content-Type: application/json
GET /registry/hello-core.json -> 200, Content-Type: application/json
GET /registry/hello-core.tar.gz -> 200, Content-Type: application/gzip
```

Verificado con un servidor HTTP estático mínimo (Node http + mapa de mime por extensión)
sirviendo `apps/web/build/`. Ver hallazgo (a) más abajo sobre `vite preview`.

### 6. `pnpm test` y `pnpm lint` (raíz, monorepo)

```
$ pnpm test
 Test Files  4 passed (4)
      Tests  20 passed (20)

$ pnpm lint
$ eslint .
(sin errores)
```

### 7. Inyección del spike (`scripts/inject-spike.mjs`)

```
$ node scripts/inject-spike.mjs
[inject-spike] wrote 217B -> fixtures/vite-react/src/modularcore/hello-core/hello.ts
[inject-spike] wrote 217B -> fixtures/svelte/src/modularcore/hello-core/hello.ts
[inject-spike] injected "hello-core" into 2 fixture app(s)
```

Lee `apps/web/static/registry/hello-core.json` directamente del filesystem (sin servidor
HTTP), lo valida con `registryEntrySchema` y usa `writeRegistryEntryFiles` (módulo
compartido `@modularcore/registry`, el mismo que reutilizará el CLI de Fase 3) para escribir
`files[]` respetando `target` y `encoding`.

### 8. Fixtures — compilan y ejecutan el componente inyectado

```
$ cd fixtures/vite-react && pnpm install --ignore-workspace && pnpm run build
$ vite build
✓ 13 modules transformed.
dist/index.html  0.26 kB
dist/assets/index-*.js  190.07 kB
✓ built in 58ms

$ cd fixtures/svelte && pnpm install --ignore-workspace && pnpm run build
$ vite build
✓ 110 modules transformed.
dist/index.html  0.26 kB
dist/assets/index-*.js  26.35 kB
✓ built in 46ms
```

Ambos `main.jsx`/`App.svelte` importan `./modularcore/hello-core/hello.ts` (ruta exacta del
`target` declarado en `modularcore.json`) y llaman a `helloModularCore(...)`. Si la
resolución del import hubiera fallado, `vite build` habría abortado con
"Could not resolve" — el build exitoso en ambos frameworks es la evidencia de que el
archivo TS inyectado compila y se integra sin fricción en React y Svelte.

## Hallazgos no bloqueantes (para anotar en Fase 3)

**(a) `vite preview` (sirv) trata `.tar.gz` como asset pre-comprimido.** Al servir
`apps/web/build/` con `vite preview`, el servidor de desarrollo `sirv` detecta la extensión
`.gz`, la retira para el lookup de mime-type (queda `.tar`, sin match → `Content-Type`
vacío) y añade `Content-Encoding: gzip` (asumiendo que es un `.js.gz` pre-comprimido de un
asset existente). Esto es una heurística específica de `sirv`/dev-preview, no de hosting
estático real: verificado con un servidor estático mínimo sirviendo los mismos archivos, que
devuelve `Content-Type: application/gzip` correcto y sin `Content-Encoding`. Recomendación
para Fase 3: al elegir el host de producción (CDN/estático), confirmar que no aplica
`gzip_static`/auto-decodificación sobre `*.tar.gz`; si el host elegido tuviera ese
comportamiento, usar extensión `.tgz` o cabeceras explícitas por config del host.

**(b) `predev`/`dev` dependen de `build:registry` vía dos mecanismos.** `apps/web/package.json`
declara `predev` (hook de pnpm) y además `turbo.json` declara `dev: { dependsOn:
["^build", "build:registry"] }` — redundante a propósito (FMA7: sin registry, `/registry/*`
no existe), ya que el soporte de pre/post-scripts de pnpm depende de configuración local
(`enable-pre-post-scripts`). No bloqueante; documentar en Fase 3 cuál de los dos mecanismos
es el "fuente de verdad" si se simplifica.

## Decisión de diseño documentada

**Fixtures fuera del workspace pnpm.** `fixtures/vite-react` y `fixtures/svelte` son apps
throwaway del spike, no packages publicables — se mantienen fuera de `pnpm-workspace.yaml`
(comentario explicativo añadido en el propio archivo) y se instalan/compilan con
`pnpm install --ignore-workspace` desde su propio directorio, con su propio lockfile
implícito. Evita que su footprint de dependencias (React, Svelte, Vite duplicados) entre en
el grafo de turbo/pnpm del monorepo real.

**Tarball con `tar-stream` + `zlib.gzipSync`.** Se evaluó implementar un tar casero (según
nota del plan) pero `tar-stream` (paquete puro JS, sin dependencias nativas, resuelto sin
problema desde el registro npm) permite construir el tar en memoria a partir de
`files[]` sin pasar por filesystem, y `zlib.gzipSync` (builtin de Node) hace la compresión —
más simple y robusto que reimplementar el formato tar.

## Archivos creados/modificados

**Creados:**
- `packages/registry/{package.json,tsconfig.json,vitest.config.ts}`
- `packages/registry/src/{schema.ts,schema.zod.ts,resolve-write.ts,build-registry.ts,tarball.ts,index.ts}`
- `packages/registry/test/{schema.zod.test.ts,resolve-write.test.ts,build-registry.test.ts,tarball.test.ts}`
- `packages/registry/test/fixtures/packages/{public-widget,internal-hello}/*`
- `packages/hello-core/{package.json,tsconfig.json,modularcore.json}`
- `packages/hello-core/src/hello.ts`
- `apps/web/{package.json,svelte.config.js,vite.config.ts,tsconfig.json,vitest.config.ts}`
- `apps/web/src/app.html`, `apps/web/src/routes/{+page.svelte,+layout.ts}`
- `apps/web/scripts/build-registry.mjs`
- `scripts/inject-spike.mjs`
- `fixtures/vite-react/{package.json,vite.config.js,index.html,src/main.jsx}`
- `fixtures/svelte/{package.json,vite.config.js,index.html,src/main.js,src/App.svelte}`

**Modificados:**
- `turbo.json` (task `build:registry`; `build`/`dev` dependen de ella)
- `package.json` raíz (`build:registry`, `inject:spike` scripts; `@modularcore/registry` devDependency)
- `pnpm-workspace.yaml` (comentario documentando exclusión de `fixtures/*`)
- `.gitignore` (añadido `fixtures/*/src/modularcore/` — artefacto generado por el spike)
- `eslint.config.js` (globals node/browser — gap de Fase 1 expuesto por el nuevo código; sin esto `pnpm lint` fallaba con `no-undef` en `console`/`document`)
- `pnpm-lock.yaml` (dependencias nuevas: zod, tar-stream, @sveltejs/*, svelte, vite, globals)

## Resultado de `pnpm build` (resumen final)

```
Tasks:    4 successful, 4 total
Cached:    2 cached, 4 total
```

## Resultado de `pnpm test` (resumen final)

```
Test Files  4 passed (4)
     Tests  20 passed (20)
```

## Success Criteria (checklist)

- [x] Descriptor inválido falla el build con error claro (zod) — test + verificado manualmente.
- [x] `pnpm build:registry` emite `index.json`, `hello-core.json`, `hello-core.tar.gz`.
- [x] Endpoints devuelven los 3 recursos con content-type correcto (en hosting estático plano; ver hallazgo (a) sobre `vite preview`).
- [x] `hello-core` inyectado compila y corre en Vite+React **y** en Svelte.
- [x] Report go/no-go escrito con evidencia (este documento).

## Concerns/Blockers

Ninguno bloqueante. Ver hallazgos (a) y (b) arriba para seguimiento en Fase 3.

Status: DONE
