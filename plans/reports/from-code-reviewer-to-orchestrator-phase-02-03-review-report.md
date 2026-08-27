# Code Review: Fase 2 (auto-seo) + Fase 3 (mcp-server)

## Scope
- Diff: working tree sin commitear, `packages/auto-seo/*` (nuevo) y `packages/mcp-server/*` (nuevo).
- `packages/cli/src/*` aparece modificado en `git status`, pero confirmado (contra el reporte ya aprobado de Fase 1 y el propio diff) que esos cambios pertenecen a la extracción de `@modularcore/registry-client` de Fase 1, ya revisada y aprobada — no forman parte de esta revisión y no violan el requisito (k) de la Fase 3 ("no modifica `packages/cli/src/*`" es un requisito de la Fase 3, cumplido: cero archivos de `packages/cli/src/*` tocados por el trabajo de mcp-server).
- Requisitos: `phase-02-registry-client-compartido.md` (contenido real = Auto-SEO) y `phase-03-auto-seo-json-ld-core.md` (contenido real = MCP Server).
- Comandos ejecutados yo mismo: `pnpm -w build`, `pnpm -w test`, `pnpm lint`, `npx madge --circular`, `wc -l`.

## Overall Assessment

Ambas fases están implementadas fielmente contra los requisitos, incluyendo los puntos de red-team marcados como "hard gate" (escapado de `<` en auto-seo, elicitation obligatoria en mcp-server con los dos casos distintos de rechazo). No encontré hallazgos Critical o High. Todo el código nuevo está bien acotado, sin over-engineering ni abstracciones genéricas injustificadas, y los tests ejercitan comportamiento real (no son phantom tests).

## Verificación punto por punto

### FASE 2 (auto-seo)

**(a) 7 tipos Schema.org con Zod schema + test válido + test de campo requerido faltante**

`packages/auto-seo/core/schema-types.ts:13-97` define los 7 tipos (`Article`, `Product`, `Organization`, `BreadcrumbList`, `WebSite`, `LocalBusiness`, `FAQPage`) con su set mínimo de campos requeridos vía `requiredFieldsByType` + Zod `.object({...}).passthrough()`. `packages/auto-seo/test/create-schema.test.ts` tiene un `describe` por tipo con exactamente un caso válido (`valid: true`) y un caso de campo requerido faltante (`valid: false` + mensaje de error que menciona el campo), más un caso adicional de `@type` ausente. Cumple.

**(b) HARD GATE: `stringify()` nunca produce `<` sin escapar**

`packages/auto-seo/core/stringify.ts:54-58` — `JSON.stringify()` seguido de `.replace(/</g, '\\u003c')` (regex global, no solo el primer match). `packages/auto-seo/test/stringify.test.ts:6-26` inyecta `</script><script>alert(1)</script>` como valor de campo y verifica explícitamente:
- `output.includes('<')` → `false` (no solo que `JSON.parse` no falle).
- El output contiene la secuencia escapada exacta `</script><script>alert(1)</script>`.
- El output NO contiene `</script>` literal.
- Round-trip: des-escapando manualmente y parseando, el valor original se recupera intacto.

Un segundo test (`stringify.test.ts:28-37`) verifica que las 3 ocurrencias de `<` en `<a><b><c>` se escapan todas, no solo la primera. Cumple el hard gate tal como lo exige el plan — no es un test que solo comprueba `JSON.parse()`.

**(c) `schema-dts` como devDependency**

`packages/auto-seo/package.json:22-28` — `zod` está en `dependencies`, `schema-dts` está en `devDependencies`. Correcto: `schema-types.ts` solo importa tipos (`import type { Article as ArticleDts, ... } from 'schema-dts'`), sin uso en runtime.

**(d) Sin dependencias de framework en el core**

`grep -rn "React\|Svelte\|svelte\|next\b"` sobre `packages/auto-seo/core/` y `package.json` → cero resultados. Confirmado.

**(e) No se creó `modularcore.json`**

`find packages/auto-seo -iname "modularcore.json"` → sin resultados. Correcto, el plan explícitamente pospone el descriptor a Fase 4.

### FASE 3 (mcp-server)

**(f) Las 4 tools existen y usan `@modularcore/registry-client`**

`search_components` (`src/tools/search-components.ts`), `get_component` (`src/tools/get-component.ts`), `install_component` (`src/tools/install-component.ts`), `check_updates` (`src/tools/check-updates.ts`) — las 4 registradas en `src/index.ts:28-31`. Todas reciben `client: RegistryClient` desde `@modularcore/registry-client` (creado una sola vez en `index.ts:24` vía `createRegistryClient`); `install_component` además importa `isTrackedWriteError`, `resolveTargetPath`, `writeFilesTracked` del mismo paquete — sin fetch/escritura reimplementados. Cumple DRY tal como exige el plan.

**(g) `install_component` nunca escribe sin elicitation confirmada — casos distintos**

`packages/mcp-server/test/install-component.test.ts` tiene 6 tests, incluyendo dos casos explícitamente distintos:
- Línea 96-115: `supportsElicitation: true` + handler que retorna `{ action: 'decline' }` → usuario rechaza (cliente SÍ soporta elicitation). Verifica `isError: true`, mensaje que matchea `/cancelada/i`, y que no se escribió ningún archivo.
- Línea 117-135: `supportsElicitation: false` → cliente sin soporte de elicitation. Verifica `isError: true`, mensaje que matchea `/no soporta elicitation/i`, y cero archivos escritos.

En `src/tools/install-component.ts:126-158`, el `try/catch` alrededor de `server.server.elicitInput(...)` distingue explícitamente (comentario línea 147-149) entre el throw síncrono cuando el cliente no declara soporte de elicitation vs. el flujo normal donde el usuario declina (`elicited.action !== 'accept'`, línea 160). Dos código-paths reales, no una sola rama cubriendo ambos casos con aserciones genéricas. Cumple.

**(h) Lectura de `.env.example` pasa por el mismo clamp que las escrituras + test de traversal**

`src/tools/install-component.ts:53-62` (`readExistingEnvKeys`) llama `resolveTargetPath(projectRoot, ENV_EXAMPLE_FILENAME)` antes de `readFile`. Además, el `targetPath` de entrada del usuario se clampa primero contra `serverProjectRoot` en el handler (línea 88, `resolveTargetPath(serverProjectRoot, targetPath)`) — un `targetPath` malicioso nunca llega a `readExistingEnvKeys`. Test explícito de traversal en `install-component.test.ts:137-164`: `targetPath: '../../../etc'` → `isError: true`, mensaje matchea `/outside/i`, cero llamadas a elicitation, y el `.env.example` del propio fixture no fue tocado (verificado por `listFilesRecursive`). El clamp subyacente (`resolveWriteTargetPath` en `packages/registry/src/resolve-write.ts:17-29`) rechaza tanto paths absolutos como escapes vía `..` con comparación de prefijo normalizado (`resolved.startsWith(rootWithSep)`), sin la clásica vulnerabilidad de prefijo-sin-separador (ej. `/root-evil` no pasaría como prefijo de `/root`). Cumple.

**(i) `MODULARCORE_REGISTRY_URL` sin default de producción, fuerza https**

`src/config.ts:37-42` — si no hay flag ni env var, lanza `McpServerConfigError` explícito ("No hay una URL de producción por defecto"), sin fallback hardcodeado. Líneas 53-60 — rechaza `http://` salvo que `--allow-insecure-registry` o `MODULARCORE_REGISTRY_ALLOW_INSECURE=1` estén presentes, documentado como opt-in explícito. `test/config.test.ts` (7 tests, verde) cubre estos casos. Cumple.

**(j) Concurrencia de tool calls durante elicitation pendiente — documentado**

`src/index.ts:13-21` — comentario explícito indicando que las tool calls NO se serializan (verificado contra SDK 1.30.0), y que un `install_component` pendiente de elicitation no bloquea otras tools. `install-component.test.ts:166-197` lo prueba empíricamente: dispara `install_component` con una elicitation que se resuelve manualmente después, y mientras está pendiente ejecuta `search_components` con éxito antes de liberar la elicitation. No es un unknown silencioso — está documentado y probado. Cumple.

**(k) `packages/cli/src/*` no modificado por Fase 3**

Confirmado: los cambios en `packages/cli/src/*` visibles en `git status` corresponden a la extracción de Fase 1 (`RegistryClientError`, `formatCliTopLevelError`, remap de `paths` en los call-sites de `add`/`diff`/`update`), ya revisados y aprobados en `plans/reports/from-code-reviewer-to-orchestrator-phase-01-review-report.md`. El trabajo de `mcp-server` es un consumidor puro de `@modularcore/registry-client`, cero archivos de `packages/cli/src/*` tocados por esta fase. Cumple.

### GENERAL

**(l) Límite de 1000 líneas**

`wc -l` sobre todos los archivos `.ts` de ambos paquetes (excluyendo `dist/`, `node_modules/`, `.turbo/`): máximo real 200 líneas (`install-component.ts`), seguido de 198 (`install-component.test.ts`). Ningún archivo se acerca al límite. Cumple.

**(m) Build/test/lint**

Ejecutados por mí directamente (no solo confiando en el reporte del orquestador):
- `pnpm -w build` → 10/10 tareas exitosas (incluye `@modularcore/auto-seo:build` y `@modularcore/mcp-server` vía cache).
- `pnpm -w test` → 44 archivos, **300/300 tests verdes**, incluye explícitamente `@modularcore/auto-seo/test/{stringify,create-graph}.test.ts` (create-schema no apareció en el log truncado pero corrió como parte del conteo total) y `@modularcore/mcp-server/test/{install-component,config,search-components,get-component,check-updates}.test.ts`.
- `pnpm lint` → limpio, sin salida de eslint.

**(n) Sin dependencias circulares nuevas**

`npx madge --circular --extensions ts` sobre `packages/{auto-seo/core,mcp-server/src,registry-client/src,registry/src,cli/src}` → "No circular dependency found!" (50 archivos procesados).

## Hallazgos

Ninguno de severidad Critical/High. Sin hallazgos Medium tampoco — ambas fases cumplen los "hard gates" del red-team con evidencia directa de código y tests, no solo con comentarios que lo afirman.

Una observación Low, no bloqueante:

1. **[Low, informativo]** `install_component` en `src/tools/install-component.ts:100-107` compara `version !== descriptor.version` con igualdad estricta de string (no semver). Esto está documentado explícitamente en el `inputSchema` del campo `version` (línea 24-31) y en la descripción de `check_updates` (línea 40-41: "Plain string equality... no semver comparison is performed") como decisión de diseño consciente dado que el registry solo sirve una versión publicada por componente. No es un defecto — señalo solo para que quede registrado como decisión intencional, no como omisión, si en el futuro el registry soporta versiones históricas.

## Fact-check de los reportes de los implementadores

Verificado contra código real, no solo aceptado:
- Reporte de auto-seo: afirmación de que `schema-dts` es devDependency — confirmado en `package.json`. Afirmación de escapado explícito de `<` — confirmado leyendo `stringify.ts` y el test del hard gate línea por línea (no solo el resumen).
- Reporte de mcp-server: afirmación de SDK pinneado en `1.30.0` (no `^1.30.0`) — confirmado en `package.json:23`, coincide con la corrección Red-team #2 del plan. Afirmación de que las tool calls no se serializan — confirmado con el test de concurrencia real (`install-component.test.ts:166-197`), no solo el comentario en `index.ts`.

## Recommended Actions

Ninguna acción bloqueante. Ambas fases pueden considerarse cerradas según los criterios de éxito de sus respectivos archivos de plan.

## Unresolved Questions

Ninguna.

---

Status: DONE
Summary: Fase 2 (auto-seo) y Fase 3 (mcp-server) aprobadas — los dos hard gates de red-team (escapado `<` en `stringify()` y elicitation obligatoria con los dos casos distintos de rechazo/no-soporte) están implementados y probados con evidencia directa; build/test/lint corridos por mí mismo y verdes (300/300 tests), sin archivos que excedan 1000 líneas, sin dependencias circulares, `packages/cli/src/*` intacto por parte de Fase 3.
Concerns/Blockers: Ninguno.
