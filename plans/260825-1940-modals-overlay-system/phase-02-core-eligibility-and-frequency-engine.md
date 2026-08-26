---
phase: 2
title: "Motor de Elegibilidad y Frecuencia"
status: pending
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Motor de Elegibilidad y Frecuencia

## Overview

Funciones **puras** (testables en Node, sin DOM) que deciden qué overlays son elegibles: filtrado
por `isActive`, ventana de fechas, targeting de rutas, y **frecuencia persistida client-side**.
Aquí vive la divergencia arquitectónica clave vs codeia (que lo hace server-side con DB).

## Requirements

- Funcional: `filterEligible(configs, path, store, now)` → subconjunto elegible, ya evaluada frecuencia.
- Funcional: targeting con la semántica de codeia (`route.ts active:60-67`), **reglas inlineadas** en
  este plan y en tests (RT-S8): `pages` vacío = todas; `'/'` exacto; otros `startsWith`; `excludePages` excluye.
- Funcional: frecuencia con 4 reglas evaluadas contra un store inyectable.
- No funcional: cero acceso directo a `window`/`localStorage`/`Date.now` global — todo inyectable;
  un único `Date` (`now`) por evaluación (RT-SC2).

## Architecture

### `core/storage.ts` — detección robusta (patrón `ai-chat/core/history/local.ts:17-32`, RT-FM5)

```ts
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;   // NUNCA lanza: envuelto en try/catch
  remove(key: string): void;
}
/**
 * Detecta con PROBE (no sólo `typeof window`): intenta setItem/removeItem de una clave throwaway.
 * Safari private / quota / SSR shims definen el global pero LANZAN al acceder — por eso el probe.
 * Si falla, degrada a memoria. `set` siempre atrapa QuotaExceededError para no romper `show()`.
 */
export function browserStorage(kind: 'session' | 'local'): KeyValueStorage;
export function memoryStorage(): KeyValueStorage;   // fake para tests
```

### `core/frequency.ts` — store consolidado (RT-SC8) + reglas puras

Para reducir el threading de un par `{session,local}` por 4 firmas (RT-SC8), se expone UN store:

```ts
export interface FrequencyStore {
  isBlocked(config: ModalConfig, now: Date): boolean;
  record(config: ModalConfig, now: Date): void;
}
/** Ensambla internamente session+local (o memoria en fallback). Inyectable para tests. */
export function createFrequencyStore(deps?: {
  session?: KeyValueStorage; local?: KeyValueStorage;
}): FrequencyStore;
```

Reglas (semántica codeia `route.ts active:71-104`, sustrato = storage client-side; **inlineadas** aquí):
- `always` → nunca bloquea; `record` no persiste.
- `once-per-session` → clave `modals:shown:{id}` en `sessionStorage`; bloquea si existe.
- `once-per-day` → clave en `localStorage`; bloquea si `now - stored < 24h` (diferencia en ms, no día
  calendario, para evitar ambigüedad TZ).
- `once-ever` → clave en `localStorage`; bloquea si existe cualquier registro.

### `core/eligibility.ts` — orquestación de filtros (puro)

```ts
export function matchesTargeting(path: string, targeting?: ModalConfig['targeting']): boolean;
export function isWithinDateWindow(config: ModalConfig, now: Date): boolean;
export function filterEligible(
  configs: ModalConfig[], path: string, store: FrequencyStore, now: Date,
): ModalConfig[];
```

- Un único `now: Date` recibido del manager (`deps.now()` resuelto una vez por `load()`, RT-SC2).
  `ModalsContext` ya NO lleva `now` (Fase 1).
- Pipeline: `isActive !== false` → `isWithinDateWindow` → `matchesTargeting` → `!store.isBlocked`.
- La **selección por slot/priority** NO va aquí (va en el manager, Fase 3): depende de slots ocupados
  en runtime.

## Data Flow

`ModalConfig[]` + `path` + `FrequencyStore` + `now` → `filterEligible` → elegibles (sin resolver
slot/trigger). `store.record` lo llama el manager **cuando el overlay se muestra**, no en el filtro.

## Related Code Files

- Create: `packages/modals/core/storage.ts`, `core/frequency.ts`, `core/eligibility.ts`
- Reference (no modificar): `ai-chat/core/history/local.ts:17-32` (probe), codeia `route.ts` (semántica inlineada)

## Implementation Steps

1. `storage.ts`: `KeyValueStorage`, `browserStorage` con probe + `set` try/catch, `memoryStorage`.
2. `frequency.ts`: `FrequencyStore` + `createFrequencyStore` con las 4 reglas; `now` inyectado.
3. `eligibility.ts`: `matchesTargeting`, `isWithinDateWindow`, `filterEligible(configs, path, store, now)`.
4. Tests unit (Fase 7 consolida): store en memoria, fechas límite, targeting include/exclude, cada regla (borde 24h con `now` inyectado).

## Success Criteria

- [x] `filterEligible` probado en Node sin `window` usando `createFrequencyStore({session:memoryStorage(),local:memoryStorage()})`.
- [x] Targeting: `[]`=todas, `'/'` sólo raíz, `/blog` matchea `/blog/x`, `excludePages` gana.
- [x] `once-per-day` respeta borde de 24h con `now` inyectado (test determinista).
- [x] `browserStorage` en modo quota/private (probe falla) degrada a memoria sin lanzar (test).
- [x] Ningún archivo importa framework ni toca DOM salvo `browserStorage` (guardado por probe).

## Risk Assessment

- **Zona horaria en `once-per-day`** (Media) → diferencia en ms (24h), no día calendario. Documentar.
- **SSR/quota: storage lanza** (Media, resuelto por RT-FM5) → probe + `set` try/catch; fallback memoria.
- **Divergencia semántica con codeia** (Baja) → reglas inlineadas + tests propios; no depende de leer el repo externo (RT-S8).
