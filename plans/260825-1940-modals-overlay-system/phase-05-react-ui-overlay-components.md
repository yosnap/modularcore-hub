---
phase: 5
title: "UI React por Overlay"
status: pending
priority: P1
effort: "1-1.5d"
dependencies: [4]
---

# Phase 5: UI React por Overlay

## Overview

Componentes React de render por tipo de overlay, **mobile-first responsivos**, **accesibles** y con
**endurecimiento de seguridad en el render** (los 3 campos no confiables: `message`, `imageUrl`,
button `url`). Un único set con classNames mínimos (patrón real de media-picker; sin variantes de
estilo — ver Non-Goals). Consume la utilidad a11y creada en la Fase 4.

## Requirements

- Funcional: `ModalOverlay`, `FullscreenOverlay`, `TopBanner`, `BottomBanner`, `SlideIn`, `Toast`,
  y `ModalsRenderer` que mapea `state.active[slot]` + `state.toasts[]` → componentes.
- Funcional: callbacks (`onPrimary`/`onSecondary`/`onClose`) reenvían a `dismiss(id, action)`.
- No funcional (seguridad): sanitización/allowlist EN EL PAQUETE (no "el consumidor decide" — RT-S1/S2/S3/S5).
- No funcional (a11y): focus trap + `role="dialog"`/`aria-modal` en modal/fullscreen; Escape cierra;
  `aria-live="polite"` en toast/banners; foco retorna al abridor; respeta `prefers-reduced-motion`.
- No funcional (responsive): mobile-first, sin scroll horizontal.

## Architecture

### Frontera de seguridad en el render (RT-S1..S5) — importa `ui/safe/*` (creado en Fase 4)

Usar los helpers compartidos `ui/safe/url.ts` (`safeHref`, `safeImageSrc`) y `ui/safe/style.ts`
(`safeColor`) creados en la Fase 4:
- `safeHref`: allowlist `https:`/`http:`/`mailto:`/`tel:`; descarta `javascript:`/`data:`/otros (RT-S1).
- `safeImageSrc`: sólo `https:` (`data:` opt-in con cap) (RT-S3).
- `safeColor`: valida hex/`rgb()`/`rgba()`, si no cumple → ignora (RT-S5). `maxWidth` ya es enum
  cerrado (Fase 1) → mapea a clase, no a string de estilo.
- **`message`** (RT-S2): por defecto se renderiza como TEXTO (`{config.message}` en JSX = textContent).
  Si `config.allowHtml === true`, pasar por `renderMarkdownToHtml` de `@modularcore/ai-chat`
  (`packages/ai-chat/ui/markdown.ts`, ya dependencia cross-package en `apps/web`) y sólo entonces
  `dangerouslySetInnerHTML`. NUNCA `innerHTML` crudo del `message`.
- Enlaces externos: `rel="noopener noreferrer"` por defecto (RT-S4). `<img>` con
  `referrerpolicy="no-referrer"` (RT-S3).
- Estilos aplicados vía objeto `style={{...}}` con valores ya validados, nunca concatenación de strings.

### Diseño responsive por tipo (mobile-first — FUENTE ÚNICA, referenciada por Fase 6)

| Tipo | Móvil (<640px) | Desktop | A11y específico |
|------|----------------|---------|-----------------|
| `modal` | full-width con margen, `max-height:90vh` scroll interno, centrado | ancho por `maxWidth` (enum→clase), centrado | focus trap, `aria-modal`, Escape, backdrop click → `outside-click` |
| `fullscreen` | 100vw×100vh | 100vw×100vh | focus trap, Escape, close visible |
| `top-banner` | sticky top, apilado, botón full-width | fila horizontal | `role="region"` `aria-live=polite`; no roba foco |
| `bottom-banner` | sticky bottom, apilado | fila horizontal | idem top |
| `slide-in` | ancho casi completo, entra desde bottom | esquina (bottom-right), ancho fijo | `aria-live=polite`; Escape cierra |
| `toast` | apilado full-width | esquina, ancho fijo, **stack** (cap del manager) | `aria-live=polite`; auto-dismiss; sin focus trap |

- Animaciones CSS cortas; si `prefersReducedMotion()` → sin transición.
- classNames semánticos (`modals-modal`, ...) + estilos scoped mínimos, como el `<style>` del playground media-picker.

### Toast (RT-FM1/FM6)

- `ModalsRenderer` mapea `state.toasts[]` → varios `<Toast key={config.id}>` (lista, no slot único).
- Auto-dismiss en `useEffect` **keyed por `config.id`**, con cleanup que cancela el timer al desmontar
  O al cambiar el id; `dismiss` idempotente (Fase 3) evita doble `trackInteraction` si el timer dispara
  tras un cierre manual.

## Data Flow

`useModals` → `state.active` + `state.toasts` → `<ModalsRenderer onDismiss={dismiss}>` → componente
por `type` con `config` saneado + callbacks → `dismiss(id, action)`.

## Related Code Files

- Create: `packages/modals/ui/react/ModalOverlay.tsx`, `FullscreenOverlay.tsx`, `TopBanner.tsx`, `BottomBanner.tsx`, `SlideIn.tsx`, `Toast.tsx`, `ModalsRenderer.tsx`
- Import (no modificar): `ui/a11y/focus-trap.ts`, `ui/a11y/reduced-motion.ts`, `ui/safe/url.ts`, `ui/safe/style.ts` (Fase 4)
- Reference: `packages/ai-chat/ui/markdown.ts` (renderMarkdownToHtml), `media-picker/ui/react/*`

## Implementation Steps

1. Componentes por tipo; modal/fullscreen usan focus-trap + Escape; banners/slide-in/toast usan aria-live.
3. Render seguro: `message` texto por defecto / `allowHtml` vía `renderMarkdownToHtml`; `safeHref`/`safeImageSrc`; `rel`/`referrerpolicy`; `safeColor`.
4. `Toast.tsx`: auto-dismiss keyed por id con cleanup.
5. `ModalsRenderer.tsx`: singleton slots desde `active` + lista desde `toasts`.
6. Exports React **explícitos por componente a dist** en `package.json` (patrón media-picker `:53-76`, NO glob — RT-A6).
7. Tests jsdom (Fase 7): Escape, focus trap, aria-live, reduced-motion, toast auto-dismiss idempotente, `javascript:` url descartada, `message` HTML no ejecuta sin `allowHtml`.

## Success Criteria

- [x] `javascript:`/`data:` en button `url` NO llega al `href` (test); enlaces externos con `rel="noopener noreferrer"`.
- [x] `message` se renderiza como texto salvo `allowHtml:true`, y entonces pasa por sanitizer (test XSS).
- [x] `imageUrl` no-https descartado; `<img referrerpolicy="no-referrer">`.
- [x] `bgColor`/`textColor` inválidos ignorados; `maxWidth` sólo enum.
- [x] Modal/fullscreen: focus trap cicla, Escape cierra, foco retorna; toasts en stack con cap; auto-dismiss idempotente.
- [x] `prefers-reduced-motion` sin transición; sin scroll horizontal <640px (playground).
- [x] Ningún componente >400 líneas.

## Risk Assessment

- **XSS por los 3 campos no confiables** (Media→cerrado, Crítico) → sanitización/allowlist en paquete, no en consumidor (RT-S1/S2/S3).
- **Focus trap bloquea teclado** (Media, Alto) → util testeada; close siempre alcanzable.
- **Toast timer huérfano** (Media, RT-FM6) → keyed por id + `dismiss` idempotente.
