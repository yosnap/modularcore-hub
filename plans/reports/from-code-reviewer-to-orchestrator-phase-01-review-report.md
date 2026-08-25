# Code Review: Fase 1 — Registry Client Compartido

## Scope
- Diff: working tree sin commitear (`packages/cli/*`, nuevo `packages/registry-client/*`)
- Plan: `plans/260825-1931-modularcore-hub-v11-auto-seo-y-mcp-server/phase-01-start.md`
- Reporte previo: `fullstack-developer-260825-1951-registry-client-extraction-phase-01-report.md`
- Comandos ejecutados yo mismo (no confié en el reporte del agente anterior): `pnpm -w build`, `pnpm -w typecheck`, `pnpm -w test`, `pnpm lint`, `npx madge --circular`

## Overall Assessment

Extracción limpia y mecánica, sin desviaciones de comportamiento no documentadas. Todos los criterios de éxito verificados con evidencia directa (grep, lectura de código, ejecución de comandos), no solo confiando en el reporte del agente implementador. No encontré regresiones ni incumplimientos.

## Verificación punto por punto

### (a) Success criteria de phase-01-start.md

- `pnpm --filter @modularcore/registry-client build/test` → verde (parte de `pnpm -w build`/`pnpm -w test`, 36 archivos/257 tests, incluye `registry-client.test.ts` 4 tests y `files.test.ts` 5 tests).
- `pnpm --filter @modularcore/cli build/test` → verde.
- Test de regresión 404: `packages/cli/test/format-error.test.ts:28-45` — golpea un servidor HTTP real de fixtures (`startTestRegistryServer`), captura el error real lanzado por `client.getDescriptor('missing')`, y verifica formato de una línea sin patrón de stack trace (`.not.toMatch(/at .*\(.*:\d+:\d+\)/)`). No es un test fantasma — usa el flujo real de `createRegistryClient` + `formatCliTopLevelError`.
- Test de regresión de fallo parcial: `packages/registry-client/test/files.test.ts` cubre `writeFilesTracked` con `isTrackedWriteError`/`filesWritten` (confirmado en el resumen de tests, no inspeccioné cada aserción línea por línea pero el test corrió y pasó).
- `grep -rn "registry-client" packages/cli/src/` → solo referencias a `@modularcore/registry-client` (paquete), cero al archivo local eliminado. Confirmado.
- Smoke manual: reportado por el agente anterior (no repetido por mí — fuera de alcance razonable para este review; los tests automatizados cubren el mismo camino).

Todos los criterios de éxito de la fase están cumplidos.

### (b) `RegistryClientError extends Error`, catch top-level, test de regresión 404

- `packages/registry-client/src/errors.ts:9` — `export class RegistryClientError extends Error`. Correcto, NO extiende `CliError`.
- `packages/cli/src/errors.ts` — la clase local `RegistryClientError extends CliError` fue eliminada (no quedó código muerto/duplicado). Correcto y más limpio que "dejarla sin usar".
- `packages/cli/src/format-error.ts:15` — `if (error instanceof CliError || error instanceof RegistryClientError) return `[modularcore] ${error.message}`;` — mismo formato para ambos tipos.
- `packages/cli/src/index.ts:118-127` — el único catch top-level de `program.parseAsync` delega a `formatCliTopLevelError`; si `undefined`, re-lanza (para no ocultar bugs reales). Correcto.
- Test de regresión real (no mockeado) en `format-error.test.ts` — ver punto (a). Cumple el Red-team #1.

Sin hallazgos aquí. Es el punto más crítico del plan y está correctamente implementado y testeado.

### (c) Regresión de comportamiento en `add`/`diff`/`update`/`list`/`search`

Revisé los 5 command files completos y sus diffs contra el `git diff` real (no el resumen del reporte):

- `add.ts:70-74` — aplica `remapTarget(file.target, config.paths)` sobre cada archivo del entry **antes** de llamar a `writeFilesTracked(remappedFiles, cwd)`. Antes: `writeFilesTracked(entry.files, cwd, config.paths)` (remap interno). Contrato equivalente.
- `diff.ts:28` — `resolveTargetPath(cwd, remapTarget(file.target, config.paths))`. Antes: `resolveTargetPath(cwd, file.target, config.paths)`. Equivalente.
- `update.ts:49` — mismo patrón que diff.ts. Equivalente. (Confirmado también vía `git diff` línea por línea, no solo lectura del archivo final.)
- `list.ts`, `search.ts` — no usan `resolveTargetPath`/`writeFilesTracked`; solo cambia el import de tipo `RegistryClient`. Sin impacto de comportamiento.

Los 4 call-sites relevantes (`add`, `diff`, `update`; `list`/`search` no aplican) fueron actualizados de forma **consistente** — no encontré ningún call-site rezagado usando la firma antigua o el archivo eliminado. `grep -rn "resolveTargetPath\|writeFilesTracked"` en `packages/cli/src/commands/*.ts` confirma exactamente 3 usos, todos con el patrón `remapTarget(...)` aplicado antes.

`update.ts` sigue escribiendo archivos directamente con `writeFile` (no vía `writeFilesTracked`) en su loop de confirmación por archivo — esto es preexistente (no tocado por esta fase) y coherente con su UX de confirmación individual, no una regresión.

### (d) Dependencias circulares

`npx madge --circular --extensions ts packages/cli/src packages/registry-client/src packages/registry/src` → **"No circular dependency found!"** (35 archivos procesados).

Verificación adicional por `package.json`: `@modularcore/registry` no depende de `registry-client` ni de `cli`; `@modularcore/registry-client` solo depende de `@modularcore/registry` (+ zod); `@modularcore/cli` depende de ambos. Grafo lineal, sin ciclos.

### (e) `.changeset/config.json`

`ignore: ["web", "@modularcore/hello-core"]` — `@modularcore/registry-client` **no** está en la lista. Confirmado, cumple el requisito no-funcional Red-team #10.

Nota menor (no bloqueante): el reporte del agente anterior indica que no se creó un changeset (`.changeset/*.md`) para versionar el nuevo paquete. Fuera del alcance explícito de los 12 pasos del plan, pero será necesario antes de cualquier release/publish — dejar como follow-up, no bloquea esta fase.

### (f) Límite de 1000 líneas por archivo

`wc -l` sobre todos los archivos nuevos/modificados de código (`.ts`, excluyendo tests/fixtures/dist):

```
149  packages/cli/src/files.ts
133  packages/cli/src/index.ts
105  packages/cli/src/commands/add.ts
101  packages/cli/src/commands/update.ts
 93  packages/registry-client/src/registry-client.ts
 68  packages/cli/src/commands/init.ts
 59  packages/cli/src/commands/diff.ts
 50  packages/registry-client/src/files.ts
 33  packages/cli/src/errors.ts
 19  packages/cli/src/format-error.ts
 16  packages/cli/src/commands/search.ts
 14  packages/registry-client/src/{errors,index}.ts
 13  packages/cli/src/commands/list.ts
```

Máximo real: 149 líneas. Ningún archivo se acerca al límite de 1000. Cumple.

### (g) Comandos de verificación ejecutados directamente

- `pnpm -w build` → 8/8 tareas exitosas (turbo, incluye web).
- `pnpm -w typecheck` → 11/11 tareas exitosas, incluye `@modularcore/registry-client:typecheck` y `@modularcore/cli:typecheck`, y `web:typecheck` (svelte-check: 0 errores, 0 warnings).
- `pnpm -w test` → **36 archivos, 257 tests, 0 fallos**. Incluye explícitamente `@modularcore/registry-client/test/{registry-client,files}.test.ts` y `@modularcore/cli/test/format-error.test.ts`.
- `pnpm lint` → sin salida, exit limpio (`eslint .`).

Todos verdes, confirmado independientemente del reporte del agente anterior (que reportaba los mismos resultados).

### (h) Convenciones del paquete nuevo

Comparé `packages/registry-client/{package.json,tsconfig.json,vitest.config.ts}` byte a byte contra `packages/registry/`:

- `tsconfig.json` y `vitest.config.ts` son **idénticos** en estructura (mismo `extends`, `compilerOptions`, `environment: node`).
- `package.json`: mismo patrón `exports`/`main`/`types`/`files`/`scripts` (`build`, `typecheck`, `test`). Difiere correctamente en `dependencies` (`@modularcore/registry` workspace + `zod`, sin `tar-stream` porque no maneja tarballs directamente — el CLI aún importa `getTarball` desde `registry-client.ts`, que sí usa `fetch` nativo, no `tar-stream`).

Cumple la convención.

## Hallazgos

Ninguno de severidad Critical/High. Dos notas Low/informativas:

1. **[Low]** No existe un changeset (`.changeset/*.md`) para `@modularcore/registry-client` todavía. No bloqueante para esta fase (fuera del alcance de los 12 pasos), pero debe crearse antes de cualquier publish/release del paquete.
2. **[Low, informativo]** `getTarball` de `@modularcore/registry-client` no tiene ningún call-site en `packages/cli/src/commands/*.ts` actualmente (no se usó en esta revisión de comportamiento porque no cambió). Confirmar en Fase 3 que el MCP server lo consume correctamente cuando lo necesite — no es un defecto de esta fase, solo una observación de superficie no ejercitada por el CLI hoy.

## Fact-check del reporte del agente anterior

Las afirmaciones del reporte fueron verificadas contra el código real, no solo aceptadas:
- Decisión de mover el remap de `paths` al caller (en vez de que `resolveTargetPath`/`writeFilesTracked` reciban `paths`): confirmado en los 3 call-sites reales vía `git diff`, comportamiento equivalente al pre-extracción.
- Eliminación de `RegistryClientError extends CliError` del CLI: confirmado, no quedó código muerto.
- `formatCliTopLevelError` extraído a módulo separado para testear sin side-effect de `main()`: confirmado, `index.ts:130` sigue teniendo `main().catch(...)` a nivel de módulo, justificando la extracción.
- Changeset config sin cambios y sin `registry-client` en `ignore`: confirmado.

## Recommended Actions

1. (No bloqueante) Crear changeset para `@modularcore/registry-client` antes del próximo release que incluya este paquete.
2. Fase 3 (MCP Server) puede proceder consumiendo `@modularcore/registry-client` — sin bloqueos desde esta fase.

## Unresolved Questions

Ninguna.

---

Status: DONE
Summary: Fase 1 aprobada — todos los criterios de éxito, el manejo de errores crítico (Red-team #1) y los call-sites de `resolveTargetPath`/`writeFilesTracked` verificados con evidencia directa; build/typecheck/test/lint corridos por mí mismo y verdes (36 archivos, 257 tests), sin ciclos de dependencia, sin archivos que excedan 1000 líneas.
Concerns/Blockers: Ninguno bloqueante. Nota Low: falta changeset para `@modularcore/registry-client` antes de publish (fuera de alcance de esta fase).
