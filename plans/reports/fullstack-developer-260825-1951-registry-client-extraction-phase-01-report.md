# Phase Implementation Report

## Executed Phase
- Phase: phase-01-start.md ("Registry Client Compartido")
- Plan: /Volumes/EVO990/Orca/modularcore-hub/Fases-siguientes/plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/
- Status: completed

## Qué se movió (nuevo paquete `@modularcore/registry-client`)

- `packages/registry-client/package.json`, `tsconfig.json`, `vitest.config.ts` — calcados de `packages/registry/` (mismo patrón `exports`, scripts `build`/`typecheck`/`test`).
- `packages/registry-client/src/registry-client.ts` — movido tal cual de `packages/cli/src/registry-client.ts` (sin cambios de lógica HTTP/parsing).
- `packages/registry-client/src/errors.ts` — `RegistryClientError extends Error` (NO `CliError`), único cambio de comportamiento intencional.
- `packages/registry-client/src/files.ts` — `resolveTargetPath(cwd, fileTarget)` y `writeFilesTracked(files, projectRoot)` movidos desde `packages/cli/src/files.ts:19-70`, con el contrato de fallo parcial (`filesWritten` en el error) preservado.
- `packages/registry-client/src/index.ts` — re-exports públicos: `RegistryClient`, `createRegistryClient`, `RegistryClientError`, `resolveTargetPath`, `writeFilesTracked`, `isTrackedWriteError`, `TrackedWriteError`, y tipos re-exportados de `@modularcore/registry` (`RegistryEntry`, `RegistryFileWithContent`, `RegistryIndexEntry`, `WriteResult`).
- `packages/registry-client/test/registry-client.test.ts`, `test/files.test.ts` — tests movidos/adaptados, incluyendo el test de regresión del 404 y un nuevo test de fallo parcial de `writeFilesTracked` (verifica `isTrackedWriteError` + `filesWritten` exacto antes del fallo).
- `packages/registry-client/test/fixtures/registry/*.json`, `test/helpers/{test-registry-server,load-fixture-registry}.ts` — copiados desde `packages/cli/test/` para que el nuevo paquete tenga su propio servidor HTTP de fixtures sin depender del CLI.

## Qué quedó en el CLI y por qué

- `packages/cli/src/errors.ts` — conserva `CliError`, `CompatibilityError`, `DependencyCycleError`, `PromptCancelledError`. Se eliminó la clase local `RegistryClientError extends CliError` (quedaba muerta/confusa una vez que el `RegistryClientError` real vive en el nuevo paquete y extiende `Error`).
- `packages/cli/src/files.ts` — conserva `remapTarget`, `decodeFileContent`, `appendEnvExample`, `readLocalFile`, `readLocalFileBuffer`, `backupExisting`, `diffLines`/`DiffLine` (CLI-only: dependen de `modularcore.json`'s `paths` o son utilidades de `update`/`diff` no reutilizables fuera del CLI).
- **Decisión sobre `remapTarget` (punto crítico señalado en la tarea):** se mantiene en el CLI, tal como pedía la instrucción explícita. Para reconciliar eso con que `resolveTargetPath`/`writeFilesTracked` originalmente llamaban `remapTarget` internamente, cambié el contrato de ambas funciones en `@modularcore/registry-client`: ahora reciben el `target`/`files[].target` **ya remapeado por el caller**. `resolveTargetPath(cwd, fileTarget)` quedó como wrapper delgado de `resolveWriteTargetPath` de `@modularcore/registry` (solo el clamp anti path-traversal, sin concepto de `paths`). El CLI (`add.ts`, `diff.ts`, `update.ts`) aplica `remapTarget(target, paths)` antes de llamar a estas funciones. Esto cumple ambos requisitos: `remapTarget` sigue siendo CLI-only, y el nuevo paquete no conoce `paths` del proyecto CLI (concepto que sí sería específico y no reutilizable por el MCP server de la Fase 3).
- `packages/cli/src/format-error.ts` (nuevo, pequeño) — extrae `formatCliTopLevelError(error)` fuera de `index.ts` porque `index.ts` ejecuta `main()` como side-effect al importarse (haría el módulo no-testeable sin spawnear el proceso real). Esta función centraliza `error instanceof CliError || error instanceof RegistryClientError` y el formato de una línea limpia; `index.ts` la usa en su único `catch` top-level.

## Archivos modificados

- Creados: `packages/registry-client/{package.json,tsconfig.json,vitest.config.ts,src/{index,registry-client,errors,files}.ts,test/{registry-client,files}.test.ts,test/helpers/*,test/fixtures/registry/*}` (paquete completo, ~9 archivos de código + fixtures).
- Creado: `packages/cli/src/format-error.ts` (19 líneas).
- Creado: `packages/cli/test/format-error.test.ts` (regresión Red-team #1).
- Modificados: `packages/cli/src/{index,deps,errors,files}.ts`, `packages/cli/src/commands/{add,diff,update,list,search}.ts`, `packages/cli/package.json` (+ `@modularcore/registry-client: workspace:*`).
- Modificados (imports re-wired): `packages/cli/test/{deps,end-to-end,files,update-diff}.test.ts`.
- Eliminados: `packages/cli/src/registry-client.ts`, `packages/cli/test/registry-client.test.ts`.
- `.changeset/config.json`: sin cambios (confirmado que `@modularcore/registry-client` NO está en `ignore`).

## Tasks Completed

- [x] Paso 1: grep exhaustivo de dependientes antes de mover.
- [x] Paso 2: `packages/registry-client/` con package.json/tsconfig/vitest.config calcados de `packages/registry/`.
- [x] Paso 3: `registry-client.ts` movido sin cambios de lógica.
- [x] Paso 4: `errors.ts` con `RegistryClientError extends Error`.
- [x] Paso 5: `resolveTargetPath`/`writeFilesTracked` movidos (ver decisión de `remapTarget` arriba).
- [x] Paso 6: `index.ts` con re-exports.
- [x] Paso 7: dependencia workspace añadida al CLI.
- [x] Paso 8: catch top-level actualizado (vía `formatCliTopLevelError`).
- [x] Paso 9: todos los imports del CLI re-wireados a `@modularcore/registry-client`.
- [x] Paso 10: tests movidos/adaptados + test de regresión 404 + test de regresión de fallo parcial.
- [x] Paso 11: `pnpm install && pnpm -w build && pnpm -w test` verdes.
- [x] Paso 12: smoke manual (`list`, `search`, `add media-picker`, `diff`, `update`, 404 forzado x2) — comportamiento idéntico al esperado.

## Tests Status

- Typecheck (`pnpm -w typecheck`): **pass** (11/11 tareas, incluye `@modularcore/registry-client` y `@modularcore/cli`).
- Build (`pnpm -w build`): **pass** (8/8 tareas).
- Unit/integration tests (`pnpm -w test`): **pass** — 36 archivos, 257 tests, 0 fallos. Incluye:
  - `@modularcore/registry-client/test/registry-client.test.ts` (4 tests, incluye 404 y non-JSON).
  - `@modularcore/registry-client/test/files.test.ts` (5 tests, incluye clamp anti path-traversal y fallo parcial con `isTrackedWriteError`).
  - `@modularcore/cli/test/format-error.test.ts` (3 tests, regresión Red-team #1: 404 real → mensaje limpio de una línea, sin stack trace).
  - `@modularcore/cli/test/{files,deps,end-to-end,update-diff}.test.ts` — verdes tras re-wire de imports.
- Lint (`pnpm lint`): pass, sin salida.
- `grep -rn "registry-client" packages/cli/src/` — solo referencias a `@modularcore/registry-client` (paquete npm), cero al archivo local eliminado.

## Smoke manual (paso 12)

Servido `apps/web/registry-data` (ya generado por `pnpm -w build`) vía un servidor HTTP estático temporal en `127.0.0.1:8974` (no se lanzó `pnpm dev`, respetando la regla de no reiniciar el dev server sin permiso). `init` es 100% interactivo (`@clack/prompts`) y no toca código movido en esta fase, así que en vez de simularlo con stdin (`update`/`add`/`diff`/`list`/`search` sí se ejercitaron con el binario real), escribí un `modularcore.json` equivalente al que `init` produce y ejecuté el CLI real compilado (`packages/cli/dist/index.js`) contra un proyecto temporal:

- `modularcore list` → índice correcto (`ai-chat`, `media-picker`).
- `modularcore search media` → filtrado correcto.
- `modularcore add media-picker` (con peers `react`+`svelte` declarados) → 25 archivos escritos bajo `src/lib/modularcore/media-picker/...`, `.env.example` poblado, `modularcore.json` actualizado con `installed.media-picker`.
- `modularcore diff media-picker` → `unchanged` en todos los archivos; tras editar `provider.ts` manualmente, reporta `changed` con diff correcto.
- `modularcore update media-picker` (declinando) → `unchanged`/`skipped`, sin backup — comportamiento esperado.
- **404 forzado** (`registryUrl` apuntando a un path inexistente): tanto `list` como `add media-picker` imprimen exactamente `[modularcore] <mensaje accionable> (404 en "...")`. Corre `pnpm build:registry`... con `exit=1`, **una sola línea, sin stack trace** — confirma que `RegistryClientError` (ahora `extends Error`, importado de `@modularcore/registry-client`) sigue siendo capturado por el catch top-level del CLI vía `formatCliTopLevelError`.

Todos los resultados idénticos al comportamiento pre-extracción. Sin fallos que requirieran rollback.

## Desviaciones del plan original (con justificación)

1. **`remapTarget` permanece en el CLI, pero `resolveTargetPath`/`writeFilesTracked` cambian de firma** (ya no reciben `paths`, reciben el target ya remapeado). Justificación: la tarea explícitamente pedía conservar `remapTarget` en el CLI (concepto ligado a `modularcore.json`), y a la vez que el nuevo paquete no conozca `paths` del proyecto CLI. Ambas cosas son incompatibles si `resolveTargetPath`/`writeFilesTracked` siguen llamando `remapTarget` internamente, así que moví la responsabilidad de remapeo al caller (el CLI). Esto es más limpio para el consumidor futuro (MCP server, Fase 3): `resolveTargetPath` queda como un clamp puro reutilizable sin ningún concepto CLI-specific.
2. **Extracción de `formatCliTopLevelError` a `packages/cli/src/format-error.ts`** (no estaba en la lista de archivos del plan). Justificación: `index.ts` ejecuta `main()` como side-effect al importarse (`main().catch(...)` a nivel de módulo), así que no se puede importar en un test unitario sin spawnear el proceso real. Extraer la función de formateo a un módulo sin side-effects fue la única forma de dar cobertura de test directa y no-frágil al Requirement Critical #1 (test de regresión del catch top-level) sin reescribir la estructura de `index.ts` ni depender de spawnear el binario compilado en la suite de vitest.
3. La clase local `RegistryClientError extends CliError` en `packages/cli/src/errors.ts` se eliminó (no solo se dejó "vieja e inutilizada") porque mantenerla habría dejado dos clases con el mismo nombre y semántica de herencia contradictoria en el mismo repo, un riesgo real de confusión/import equivocado.

## Next Steps

- Ninguno bloqueante. La Fase 3 (MCP Server) puede consumir `@modularcore/registry-client` directamente (`createRegistryClient`, `resolveTargetPath`, `writeFilesTracked`) sin depender de conceptos CLI-only.
- No se creó un changeset (`.changeset/*.md`) para versionar `@modularcore/registry-client` — no estaba en el alcance explícito de los 12 pasos de esta fase; indicarlo si se requiere antes de un release.

## Unresolved Questions

Ninguna.
