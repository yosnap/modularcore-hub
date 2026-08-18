# Review: pinnedFetch/pinnedLookup fix en core/sources.ts

## Alcance
- `core/sources.ts` (pinnedLookup, PinnedFetch, pinnedFetch, fromRemoteUrl)
- `test/sources.test.ts`
- `test/sources.pinned-fetch.integration.test.ts`
- Build + test suite completa del paquete

## Verificación
- `pnpm --filter @modularcore/media-picker build` → verde (tsc limpio)
- `pnpm --filter @modularcore/media-picker test` → 62/62 tests, verde

## Hallazgos

Ninguno bloqueante.

### Cosmético (no bloqueante)
- `core/sources.ts:123` — el comentario de `fromRemoteUrl` referencia `pinnedDispatcher`, símbolo que ya no existe (renombrado a `pinnedFetch`). Único resto del nombre viejo en código fuente (los hits en `dist/` son build output). Recomendado: actualizar el comentario a `pinnedFetch`.

## Confirmaciones

1. `dispatcher` y `fetch` siempre provienen del mismo `import('undici')` dinámico (líneas 107-109); `doFetch = pinned?.fetch ?? fetch` y `dispatcher` solo se agrega al `RequestInit` cuando `pinned` existe — no hay ruta que mezcle `dispatcher` de undici con `fetch` global.
2. El `finally` con `.close().catch(() => undefined)` no puede enmascarar el error original: si el `try` ya lanzó, esa excepción ya está en vuelo antes de llegar al `finally`; el `.catch` solo evita que un fallo en `close()` produzca un unhandled rejection que reemplace el error real.
3. `vi.hoisted` en `test/sources.test.ts` está usado correctamente para evitar el problema de hoisting de `vi.mock`. `afterEach` resetea `undiciMock.fetchImpl` (suficiente, ya que `FakeAgent` se instancia nueva en cada llamada — no hay fuga de estado entre tests). Los tests "closes the pinned dispatcher" extraen el spy real de la instancia de `FakeAgent` pasada al fetch mockeado y verifican la llamada — no son tautológicos.
4. Sin referencias funcionales rotas a `pinnedDispatcher`; solo el comentario cosmético arriba.
5. Tipos (`PinnedFetch`, `pinnedLookup`) razonables. Los dos casts (`as unknown as typeof fetch` en línea 109, `as { close?: () => Promise<void> }` en línea 162) son necesarios por la carga dinámica opcional de `undici` sin tipos declarados en `dependencies`; no ocultan un error de tipo real.
6. Build y test suite verificados en verde por mí mismo.

## Nota de riesgo (no bloqueante, ya aceptado por el usuario)
`test/sources.pinned-fetch.integration.test.ts` hace un fetch real a `https://example.com/` en cada corrida de test — dependencia de red en CI. Es una decisión intencional y documentada en el propio test (regresión real contra el bug de `pinnedLookup`), no se marca como bloqueante.

## Acciones recomendadas
1. (Opcional, cosmético) Actualizar comentario en `core/sources.ts:123` de `pinnedDispatcher` a `pinnedFetch`.

## Preguntas sin resolver
Ninguna.
