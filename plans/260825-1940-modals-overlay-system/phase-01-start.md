---
phase: 1
title: "Scaffold y Modelo de Datos"
status: pending
priority: P1
effort: "0.5-1d"
dependencies: []
---

# Phase 1: Scaffold y Modelo de Datos

## Overview

Crear el esqueleto de `packages/modals` (config de build/test + manifest de registry) y el
**modelo de datos TypeScript agnóstico** de todos los overlays. Sin lógica todavía: define los
tipos que consumen todas las fases siguientes.

## Requirements

- Funcional: paquete se autodescubre por vitest workspace y turbo; build `tsc` a `dist/`.
- Funcional: tipos completos de config de overlay + enums (union types) + contexto de request.
- No funcional: doble naturaleza (importable vía `exports` + copy-code vía `modularcore.json`),
  igual que `packages/media-picker/package.json` y `modularcore.json`. Archivos <1000 líneas.

## Architecture

Estructura de carpetas (replica media-picker):

```
packages/modals/
  package.json            # exports por subpath, peerDeps react/svelte opcionales
  tsconfig.json           # extiende base; include DEBE añadir "ui/a11y" (RT-A3)
  vitest.config.ts        # unit Node (core) — patrón media-picker
  vitest.ui.config.ts     # jsdom + plugin svelte (UI) — NUEVO, sin precedente (RT-A4)
  vitest.smoke.config.ts  # smoke (opcional, provider)
  modularcore.json        # manifest registry (files/target/type/encoding)
  .env.example            # vacío/placeholder (no hay secretos reales)
  README.md
  core/types.ts           # ESTE archivo es el entregable central de la fase
```

### Modelo de datos (`core/types.ts`) — derivado de codeia `schema.prisma:2519-2559`, adaptado a TS

Union types (no enums Prisma), campos opcionales con `?`:

```ts
export type OverlayType =
  | 'modal' | 'fullscreen' | 'top-banner' | 'bottom-banner' | 'slide-in' | 'toast';

export type TriggerType =
  | 'page-load' | 'delay' | 'scroll' | 'exit-intent' | 'click' | 'manual';
// NOTA (RT-SC7): 'page-load' es un ALIAS de 'delay' con value≈0 — un solo branch en
// scheduleTrigger (Fase 3). Se mantiene el nombre por paridad con codeia, sin código duplicado.

export type FrequencyType =
  | 'always' | 'once-per-session' | 'once-per-day' | 'once-ever';

// RT-SC6: se elimina 'form-submit' (no hay overlay con formulario en el alcance; sería enum muerto).
export type InteractionAction =
  | 'primary-button' | 'secondary-button' | 'close-button' | 'outside-click';

/** Slots de instancia ÚNICA (1 overlay por slot). 'toast' NO está aquí: es multi-instancia. */
export type SingletonSlot = 'modal' | 'top-banner' | 'bottom-banner' | 'slide-in';
// fullscreen comparte el slot 'modal' (como codeia).

export interface OverlayButton {
  text: string;
  url?: string;   // Renderizado como href; el core aplica allowlist de esquema (RT-S1, Fase 5)
}

export interface ModalConfig {
  id: string;                 // requerido: clave de frecuencia/tracking
  name?: string;
  type: OverlayType;
  title?: string;
  message: string;            // Por defecto se renderiza como TEXTO (textContent), no HTML (RT-S2)
  allowHtml?: boolean;        // RT-S2: opt-in explícito; si true, el core lo pasa por un
                              // sanitizador/renderMarkdownToHtml de @modularcore/ai-chat, NUNCA innerHTML crudo
  imageUrl?: string;          // Renderizado como <img src>; el core valida esquema https/data (RT-S3)
  primaryButton?: OverlayButton;
  secondaryButton?: OverlayButton;
  showCloseButton?: boolean;  // default true en el core
  trigger: { type: TriggerType; value?: number }; // value: ms (delay) o % (scroll)
  frequency?: FrequencyType;  // default 'always'
  priority?: number;          // default 0; mayor gana el slot (irrelevante para toast)
  startDate?: string;         // ISO8601
  endDate?: string;           // ISO8601
  isActive?: boolean;         // default true
  targeting?: { pages?: string[]; excludePages?: string[] };
  // Presentación mínima (headless): valores VALIDADOS antes de aplicarse a estilos (RT-S5)
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'; // enum cerrado (RT-S5), no string libre
  bgColor?: string;           // validado contra regex hex/rgb(a) antes de aplicar (RT-S5)
  textColor?: string;         // idem
  autoDismissMs?: number;     // sólo 'toast' (Fase 5)
}

/** Contexto para elegibilidad/provider. Sin `now`: el reloj es único y vive en deps del manager (RT-SC2). */
export interface ModalsContext {
  path: string;               // ruta actual para targeting (el core usa sólo pathname en tracking, RT-S7)
}

export interface ViewEvent { modalId: string; path: string; at: string; }        // path = pathname sin query (RT-S7)
export interface InteractionEvent {
  modalId: string; action: InteractionAction; path: string; at: string;          // path = pathname sin query (RT-S7)
}
```

**Adiciones/omisiones vs codeia:**
- `'toast'` (justificado en Fase 5): notificación transitoria, **multi-instancia** (stack), a11y
  distinto (aria-live, sin focus trap). No entra en `SingletonSlot`; su estado es una **lista**
  (`OverlaysState.toasts`, Fase 3) — resuelve la contradicción single-slot (RT-FM1/SC1).
- Omitidos: `PopupPosition`, `PopupButtonAction`, `targetRoles`, `showOnce` y `'form-submit'`
  (nunca usados / duplicados / enum muerto). YAGNI.

## Related Code Files

- Create: `packages/modals/package.json` — patrón `packages/media-picker/package.json:1-115`.
  - `exports`: `.` (core/modals), `./provider`, `./providers/in-memory`, `./react`, `./svelte`,
    UI **React con mapping explícito por componente a `dist`** (patrón media-picker `:53-76`, NO glob — RT-A6),
    UI **Svelte con glob a fuente RAW** `"./ui/svelte/*": "./ui/svelte/*"` (patrón media-picker `:77` — RT-A5).
  - `files`: `["dist", "ui/svelte"]` — incluye `ui/svelte` RAW en el tarball (media-picker `:79-82` — RT-A5).
  - peerDeps react>=18 / svelte>=5 opcionales; scripts build/typecheck/test/test:ui/test:smoke.
- Create: `packages/modals/tsconfig.json` — copiar de media-picker PERO `include` DEBE ser
  `["core", "adapters", "ui/react", "ui/a11y", "ui/safe"]` (añade `ui/a11y` para que se emita a `dist` — RT-A3).
  `ui/svelte` queda FUERA del include (no lo compila tsc — RT-A5).
- Create: `packages/modals/vitest.config.ts` (Node, core), `vitest.ui.config.ts` (jsdom+svelte, ver Fase 5/7), `vitest.smoke.config.ts`.
- Create: `packages/modals/modularcore.json` — formato `packages/media-picker/modularcore.json:1-205`.
  Campos REQUERIDOS por `packages/registry/src/schema.zod.ts:48-49` (sin default): **`version`** y
  **`title`** (RT-A2/FM7), además de `name`, `type:"headless-core"`, `category`, `frameworks:["react","svelte"]`,
  `visibility:"public"`, `dependencies:[]`, `registryDependencies:[]`, `envVariables:[]`, `files:[...]`.
- Create: `packages/modals/core/types.ts`, `README.md`, `.env.example`.

## Implementation Steps

1. Copiar `package.json`/`tsconfig.json`/`vitest.config.ts` de media-picker; renombrar a `@modularcore/modals` `0.1.0`; `main/types` → `./dist/core/modals.js`.
2. Ajustar `tsconfig.json` `include` a `["core","adapters","ui/react","ui/a11y"]`.
3. Definir `exports` (React explícito por-archivo a dist; Svelte glob raw) y `files:["dist","ui/svelte"]`.
4. Escribir `core/types.ts` completo (arriba).
5. Escribir `modularcore.json` con `version`+`title`+`registryDependencies` y `files` inicial (se completa en Fase 7).
6. `pnpm install`; verificar `pnpm --filter @modularcore/modals build` compila `core/types.ts`.

## Success Criteria

- [x] `pnpm --filter @modularcore/modals build` genera `dist/core/types.d.ts`.
- [x] `pnpm --filter @modularcore/modals typecheck` verde.
- [x] `modularcore.json` pasa `registryDescriptorSchema.safeParse` (incluye `version`+`title`).
- [x] `core/types.ts` <300 líneas, sin imports de framework ni DOM.
- [x] `InteractionAction` no incluye `form-submit`; `ModalsContext` no incluye `now`.

## Risk Assessment

- **exports desincronizados con dist real** (Media) → verificados en Fase 7 con smoke de import de cada subpath.
- **Divergencia de tsconfig** (Baja) → copiar de media-picker; único delta intencional = `include` con `ui/a11y`.
