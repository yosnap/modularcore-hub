---
phase: 4
title: "Adaptadores y Utilidad a11y compartida"
status: pending
priority: P1
effort: "0.5-1d"
dependencies: [3]
---

# Phase 4: Adaptadores React/Svelte y Utilidad a11y compartida

## Overview

Bindings **delgados** de `OverlayManager` a React y Svelte 5, más la utilidad a11y compartida
agnóstica de framework (`ui/a11y/*`) que consumen las Fases 5 y 6. Colocar a11y aquí (no en Fase 5)
hace que las Fases 5 y 6 sean **genuinamente disjuntas** y paralelizables (RT-SC5).

## Requirements

- Funcional: React `useModals(provider, ctx, deps?)` → `{ state, show, dismiss, fireClick, reload }`.
- Funcional: Svelte `createModals(provider, ctx, deps?)` → rune con `get state()` + mismas acciones.
- Funcional: `ui/a11y/focus-trap.ts` + `ui/a11y/reduced-motion.ts` (puros DOM, testables jsdom).
- Funcional: helpers de render seguro compartidos `ui/safe/url.ts` + `ui/safe/style.ts` (puros,
  agnósticos; los consumen Fases 5 y 6 — creados aquí para mantenerlas disjuntas, RT-SC5).
- No funcional: instancia de `OverlayManager` **por hook/rune** (aislada); cleanup con `destroy()` en
  unmount con MECANISMO explícito (no sólo aserción); `load` al montar y cuando cambia `ctx.path` o el
  provider; provider pasado por llamada (no capturado).

## Architecture

### `ui/a11y/focus-trap.ts` (creado aquí; consumido por Fases 5 y 6)

- `createFocusTrap(el: HTMLElement): { activate(): void; deactivate(): void }` — atrapa Tab/Shift+Tab,
  guarda el `activeElement` previo y lo restaura al desactivar. Patrón util DOM puro como
  `media-picker/core/canvas/canvas-environment.ts`.

### `ui/a11y/reduced-motion.ts`

- `prefersReducedMotion(): boolean` — guarda `typeof window`/`matchMedia`.

### `ui/safe/url.ts` + `ui/safe/style.ts` (creados aquí; consumidos por Fases 5 y 6)

- `safeHref(url?)`: allowlist `https:`/`http:`/`mailto:`/`tel:`; descarta `javascript:`/`data:`/otros (RT-S1).
- `safeImageSrc(url?)`: sólo `https:` (`data:` opt-in con cap de tamaño) (RT-S3).
- `safeColor(v?)`: valida hex/`rgb()`/`rgba()` por regex, si no cumple → `undefined` (RT-S5).

### React `adapters/react/use-modals.ts` (patrón `use-media-picker.ts:46-78`)

- `useRef` para la instancia, PERO **recrear si fue destruida** (RT-FM3): en el setup del `useEffect`,
  si `ref.current` es null o está destruido, `ref.current = new OverlayManager(deps)`. `destroy()` en
  cleanup marca la instancia como destruida; el siguiente setup (StrictMode doble-mount / remount de
  ruta) crea una nueva. Sin esto, StrictMode deja un manager muerto.
- `useState(() => manager.getState())`; `useEffect` `subscribe` + `manager.load(provider, ctx)` +
  cleanup `destroy()`. Dependencias del effect: `ctx.path` (string) **y** identidad del `provider`
  (RT-SC3) → re-`load` cuando cambie cualquiera. Comparar por `ctx.path`, no por identidad de `ctx`
  (RT-Assumption: objeto nuevo por render).

```ts
export interface UseModalsResult {
  state: OverlaysState;
  show: (id: string) => void;
  dismiss: (id: string, action?: InteractionAction) => void;
  fireClick: (id: string) => void;
  reload: (ctx: ModalsContext) => Promise<void>;
}
export function useModals(provider: ModalsProvider, ctx: ModalsContext, deps?: OverlayManagerDeps): UseModalsResult;
```

### Svelte `adapters/svelte/create-modals.svelte.ts` (patrón `create-media-picker.svelte.ts:44-77`)

- **NO** copiar el patrón leak-tolerant de media-picker (que nunca destruye — no tenía listeners).
  `createModals` DEBE registrar cleanup en creación: usar `$effect(() => { manager.load(provider, ctx);
  return () => manager.destroy(); })` (válido sólo si `createModals` se llama durante init de
  componente — documentar esa restricción) — así unmount llama `destroy()` y se limpian
  scroll/mouseout/timeouts (RT-FM2/SC4). `state` es un `$state` mirror vía `subscribe`.

```ts
export interface ModalsRune { readonly state: OverlaysState; /* show/dismiss/fireClick/reload */ }
export function createModals(provider: ModalsProvider, ctx: ModalsContext, deps?: OverlayManagerDeps): ModalsRune;
```

## Data Flow

Monta → adapter crea `OverlayManager(deps)` → `subscribe(setState)` → `load(provider, ctx)` →
estado a UI. Acción UI → adapter reenvía → nuevo estado → re-render. Cambio de `ctx.path`/provider →
`reload`. Unmount → `destroy()` (React: cleanup del effect; Svelte: return del `$effect`).

## Related Code Files

- Create: `packages/modals/ui/a11y/focus-trap.ts`, `ui/a11y/reduced-motion.ts`
- Create: `packages/modals/ui/safe/url.ts`, `ui/safe/style.ts`
- Create: `packages/modals/adapters/react/use-modals.ts`, `adapters/svelte/create-modals.svelte.ts`
- Reference (no modificar): `media-picker/adapters/react/use-media-picker.ts:46-78`, `media-picker/adapters/svelte/create-media-picker.svelte.ts:44-77`

## Implementation Steps

1. `ui/a11y/focus-trap.ts` + `reduced-motion.ts`; `ui/safe/url.ts` + `style.ts` (añadir `ui/a11y` y `ui/safe` al tsconfig `include`).
2. React `useModals`: `useRef` con recreación-si-destruido; effect deps `[ctx.path, provider]`; `destroy` en cleanup.
3. Svelte `createModals`: `$effect` con `load` + return `destroy`; `$state` mirror.
4. Exports `./react`, `./svelte` en `package.json` (rutas dist; `.svelte.ts`→`.svelte.js`).

## Success Criteria

- [x] `useModals` no recrea el manager entre renders normales (test de identidad) PERO recrea tras `destroy()` (test de StrictMode doble-mount, RT-FM3).
- [x] Cambiar `ctx.path` O el provider dispara `reload` (RT-SC3); unmount llama `destroy` (sin listeners colgando — test).
- [x] Svelte: navegar fuera del componente limpia scroll/mouseout/timeouts (RT-FM2).
- [x] `ui/a11y/*` compila a `dist` (incluido en tsconfig `include`, Fase 1).
- [x] Cada adaptador <150 líneas, sin lógica de negocio.

## Risk Assessment

- **StrictMode deja manager muerto** (Media, Alto, RT-FM3) → recreación-si-destruido; test de doble-mount.
- **Svelte leak sin lifecycle** (Media, Alto, RT-FM2/SC4) → `$effect` con return destroy; restricción documentada.
- **Provider/ctx nuevo por render → reload en bucle** (Media, RT-SC3) → deps por `ctx.path` string + identidad de provider (el consumidor debe memoizar el provider; documentar).
