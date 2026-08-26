---
phase: 3
title: "Manager, Triggers y Provider"
status: pending
priority: P1
effort: "1.5d"
dependencies: [2]
---

# Phase 3: Manager, Triggers y Provider

## Overview

El corazón headless: `OverlayManager` (state machine suscribible, patrón `MediaPicker`), la
orquestación de **triggers** con entorno DOM inyectable, la interfaz `ModalsProvider` (patrón
provider sin DB), y un provider de referencia en memoria/JSON. Ninguna UI.

## Requirements

- Funcional: `ModalsProvider` con `getActiveModals(ctx)`, `trackView(evt)`, `trackInteraction(evt)`.
- Funcional: manager resuelve 1 overlay por **slot singleton** (priority desc) + una **lista de toasts**
  (multi-instancia con cap), registra triggers, al disparar muestra el overlay, llama `store.record` +
  `trackView`, y al cerrar/interactuar llama `trackInteraction` y libera el slot.
- Funcional: 5 mecanismos de trigger (`page-load` = alias de `delay` value≈0; `delay`, `scroll`,
  `exit-intent`, `click`, `manual`) con entorno inyectable.
- No funcional: last-one-wins para async **y** disposición de triggers previos en cada `load()`
  (RT-FM4); sin estado a nivel de módulo (instancia aislada por adaptador).

## Architecture

### `core/provider.ts` — el único seam (patrón `media-picker/core/provider.ts:1-8`)

```ts
export interface ModalsProvider {
  getActiveModals(ctx: ModalsContext): Promise<ModalConfig[]>;   // candidatos crudos; el core filtra
  trackView?(evt: ViewEvent): void | Promise<void>;
  trackInteraction?(evt: InteractionEvent): void | Promise<void>;
}
```

**Docstring de seguridad (RT-S6, ampliado vs "no secretos"):** un `ModalsProvider` (1) no lleva
secretos, y (2) **su salida es contenido que se renderiza en el DOM**: `message`/`imageUrl`/button
`url` pueden originarse en una DB o CMS de menor confianza → deben tratarse como **no confiables**.
El core aplica sanitización/allowlist (Fase 5) como frontera efectiva; el provider NO es fuente
confiable. Persistencia real de tracking (p.ej. Prisma) va **detrás** de los hooks, en el backend
del consumidor. Ver `docs/prisma-tracking-endpoint-example.md` (sólo docs, sin dependencia real).

### `core/providers/in-memory.ts` — provider de referencia (copy-code, análogo a `demo-storage-provider.ts`)

```ts
export interface InMemoryProviderOptions {
  modals: ModalConfig[];
  onView?(evt: ViewEvent): void;
  onInteraction?(evt: InteractionEvent): void;
}
export function createInMemoryProvider(opts: InMemoryProviderOptions): ModalsProvider;
```

### `core/triggers.ts` — programación de triggers con entorno inyectable

```ts
export interface TriggerEnvironment {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  addEventListener(t: 'scroll' | 'mouseout', fn: (e: any) => void, opts?: any): void;
  removeEventListener(t: 'scroll' | 'mouseout', fn: (e: any) => void): void;
  scrollPercent(): number;
}
export function defaultTriggerEnvironment(): TriggerEnvironment;   // usa window/document
/** Registra un trigger; devuelve un DISPOSER (limpia timeout/listener). `fire` se llama una vez. */
export function scheduleTrigger(config: ModalConfig, env: TriggerEnvironment, fire: () => void): () => void;
```

Detección (semántica codeia `popup-manager.tsx:340-389`, inlineada — RT-S8):
- `page-load` / `delay` → **un solo branch** `setTimeout(fire, config.trigger.value ?? 0)` (RT-SC7;
  `page-load` = `delay` con default 0).
- `scroll` → listener pasivo; `fire` cuando `scrollPercent() >= (value ?? 50)`.
- `exit-intent` → `mouseout` con `e.clientY <= 0` (desktop-only; documentar fallback móvil).
- `click` → `manager.fireClick(modalId)` (API imperativa; codeia lo declaraba sin handler).
- `manual` → sólo `manager.show(modalId)`; sin auto-trigger.

### `core/modals.ts` — `OverlayManager`

```ts
export interface OverlaysState {
  active: Partial<Record<SingletonSlot, ModalConfig>>;   // 1 por slot singleton
  toasts: ModalConfig[];                                  // multi-instancia, orden de llegada (RT-FM1/SC1)
  loading: boolean;
  error: Error | null;
}
export interface OverlayManagerDeps {
  triggerEnv?: TriggerEnvironment;
  store?: FrequencyStore;
  now?: () => Date;                    // ÚNICO reloj (RT-SC2); default () => new Date()
  toastCap?: number;                   // default 3 (RT-FM1)
}
export class OverlayManager {
  constructor(deps?: OverlayManagerDeps);       // NOTA: provider NO va en el constructor (RT-SC3)
  getState(): OverlaysState;
  subscribe(l: (s: OverlaysState) => void): () => void;
  /** Provider pasado por llamada (patrón use-media-picker): evita capturar un provider stale. */
  load(provider: ModalsProvider, ctx: ModalsContext): Promise<void>;
  show(modalId: string): void;
  dismiss(modalId: string, action?: InteractionAction): void;
  fireClick(modalId: string): void;
  destroy(): void;
}
```

Comportamiento clave:
- `now` se resuelve UNA vez por `load()` (`const now = (deps.now ?? defaultNow)()`) y se pasa a
  `filterEligible` (RT-SC2).
- **Provider por llamada** (RT-SC3): `load(provider, ctx)` no lo guarda en el constructor; así un
  provider recreado en cada render del consumidor nunca queda capturado (igual que `use-media-picker.ts:46-51`).
- `slotOf(type)`: `modal`+`fullscreen`→`'modal'`; `top-banner`/`bottom-banner`/`slide-in` 1:1;
  `toast` → NO usa `active`, se **appendea** a `toasts` (respetando `toastCap`, excedentes descartados).
- Selección singleton: de los elegibles no-toast, agrupar por slot, elegir mayor `priority` (empate →
  orden del provider).
- **`load()` dispone SIEMPRE los triggers de la carga previa** antes de agendar nuevos
  (`disposeTriggers()` al inicio de `load`), independiente de `destroy()` — evita que un `delay`
  pendiente de `/pricing` dispare en `/blog` (RT-FM4).
- Guardas de generación last-one-wins para los commits de estado async (patrón
  `MediaPicker.run/commitIfCurrent`, `media-picker/core/media-picker.ts:149`). Un `show` de trigger
  tardío se ignora si el manager fue recargado/destruido.
- `show`/`dismiss` **idempotentes por id** (RT-FM6): un timer tardío de toast ya cerrado es no-op.
- Al mostrar: ocupar slot / append toast + `store.record(config, now)` + `trackView({..., path: pathname})`.
- Tracking usa sólo `pathname` (sin query/hash) para no filtrar tokens (RT-S7).

## Data Flow

`provider.getActiveModals(ctx)` → `filterEligible(configs, ctx.path, store, now)` (Fase 2) →
singleton: seleccionar por slot/priority · toast: append a `toasts` (cap) → `scheduleTrigger` por
ganador → `fire`/`show`: ocupar + `record` + `trackView` → emit → adapter renderiza → `dismiss` →
`trackInteraction` + liberar → emit. `load()` nuevo → `disposeTriggers()` primero.

## Related Code Files

- Create: `core/provider.ts`, `core/providers/in-memory.ts`, `core/triggers.ts`, `core/modals.ts`
- Reference (no modificar): `media-picker/core/media-picker.ts:149` (run/commitIfCurrent), `media-picker/core/provider.ts:1-8`, `apps/web/src/lib/demo-storage-provider.ts`

## Implementation Steps

1. `provider.ts`: interfaz + docstring de seguridad (secretos + contenido no confiable).
2. `triggers.ts`: `TriggerEnvironment`, `defaultTriggerEnvironment`, `scheduleTrigger` con disposer; `page-load`/`delay` un solo branch.
3. `providers/in-memory.ts`: `createInMemoryProvider`.
4. `modals.ts`: `OverlayManager` (deps sin provider), `load(provider, ctx)` con `disposeTriggers()` inicial + `now` único, `show`/`dismiss`/`fireClick` idempotentes, `toasts` con cap, `destroy()`.
5. Tests (Fase 7): entorno DOM fake; slot por priority; **reload con nuevo path no dispara trigger viejo**; toast cap/queue; idempotencia; last-one-wins; provider por llamada.

## Success Criteria

- [x] Probado con `createFrequencyStore` de memoria + entorno fake (sin `window`).
- [x] 1 overlay por slot singleton; priority desc; empates deterministas; `toasts` respeta `toastCap` (default 3).
- [x] `load()` con nuevo `path` dispone triggers previos: un `delay` de la carga anterior NO llama `show` (test con fake timers).
- [x] `show`/`dismiss` idempotentes; timer tardío de toast cerrado = no-op (RT-FM6).
- [x] `trackView`/`store.record` una sola vez al mostrar; `trackInteraction` al `dismiss`; `path` = pathname sin query (RT-S7).
- [x] `now` resuelto una vez por `load` y threaded a elegibilidad.
- [x] Ningún archivo >1000 líneas; `core/modals.ts` sin imports de framework/DOM directos (sólo vía deps).

## Risk Assessment

- **Listeners/timers no limpiados → fugas** (Media, Alto) → disposer por trigger; `disposeTriggers()` en cada `load()` y en `destroy()`.
- **`exit-intent` no dispara en móvil** (Media, Bajo) → desktop-only; documentar `delay`/`scroll` como fallback.
- **Provider stale capturado** (Media, Alto, RT-SC3) → provider por llamada, no en constructor.
- **Toast overflow** (Baja, RT-FM1) → `toastCap` (default 3); excedentes descartados (documentado).
