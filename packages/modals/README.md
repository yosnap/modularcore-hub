# @modularcore/modals

Headless, unified overlay system — modal, fullscreen, top banner, bottom banner, slide-in, and
toast — with eligibility (targeting, date window, priority), client-side frequency capping,
trigger scheduling, and a provider pattern (no built-in DB/backend). React and Svelte 5
adapters, mobile-first and accessible.

**No database, no built-in backend.** `ModalsProvider` (see `core/provider.ts`) is the only seam
between the core and any data source: `getActiveModals(ctx)` returns raw candidates, and
`trackView`/`trackInteraction` are hooks a consumer wires to their own backend if they want
persisted analytics. This package ships `core/providers/in-memory.ts` as a reference
implementation and no more — see
[`docs/prisma-tracking-endpoint-example.md`](./docs/prisma-tracking-endpoint-example.md) for how
to wire a real backend behind the same interface.

## What's in this package

- `core/types.ts` — the framework-agnostic `ModalConfig` model (6 overlay types, triggers,
  frequency, targeting, buttons).
- `core/eligibility.ts` — pure filter: `isActive` → date window → targeting → frequency.
- `core/frequency.ts` + `core/storage.ts` — client-side frequency capping (`always` /
  `once-per-session` / `once-per-day` / `once-ever`) via injectable `sessionStorage`/
  `localStorage`. See [`docs/frequency-client-side.md`](./docs/frequency-client-side.md) for why
  this is client-side instead of server-side.
- `core/triggers.ts` — trigger scheduling (`page-load`/`delay`, `scroll`, `exit-intent`, `click`,
  `manual`) against an injectable `TriggerEnvironment`.
- `core/modals.ts` — `OverlayManager`, the headless orchestrator: resolves eligible configs into
  one winner per singleton slot (`modal`/`fullscreen` share a slot) plus a capped `toast` stack,
  schedules triggers, and shows/dismisses while notifying subscribers.
- `core/provider.ts`, `core/providers/in-memory.ts` — the provider seam + reference
  implementation.
- `adapters/react`, `adapters/svelte` — thin bindings over `OverlayManager` (Svelte adapter uses
  Svelte 5 runes). One manager instance per hook/rune, with `destroy()` wired to unmount so
  scroll/mouseout/timeout listeners are always cleaned up.
- `ui/a11y/*`, `ui/safe/*` — shared, framework-agnostic focus-trap/reduced-motion and
  URL/color-validation helpers, consumed by both `ui/react` and `ui/svelte`.
- `ui/react/*`, `ui/svelte/*` — one component set per overlay type, plus `ModalsRenderer` that
  maps manager state to them.

## Security boundary: the provider is untrusted content

`getActiveModals()` results are content rendered into the DOM. `message`, `imageUrl`, and button
`url` may originate from a database or CMS with lower trust than the code calling this package —
so `ui/react`/`ui/svelte` treat every `ModalConfig` as untrusted and apply this boundary
themselves (not delegated to the consumer):

- `message` renders as **plain text** by default. Only when `allowHtml: true` is it passed through
  `renderMarkdownToHtml` (from `@modularcore/ai-chat/markdown`, Markdown-only — never raw HTML).
- Button `url` and `imageUrl` go through an allowlist (`ui/safe/url.ts`): `https:`/`http:`/
  `mailto:`/`tel:` for links, `https:` (or size-capped opt-in `data:`) for images. `javascript:`
  and anything else is dropped, falling back to a plain `<button>`/no image instead of the
  supplied URL.
- External links always get `rel="noopener noreferrer"`; images get
  `referrerpolicy="no-referrer"`.
- `bgColor`/`textColor` are validated against a hex/`rgb()`/`rgba()` pattern (`ui/safe/style.ts`)
  before ever reaching a `style` attribute; `maxWidth` is a closed enum mapped to a class, never a
  free-form style string.

## Basic usage (React)

```tsx
import { useModals } from '@modularcore/modals/react';
import { ModalsRenderer } from '@modularcore/modals/ui/react/ModalsRenderer';
import { createInMemoryProvider } from '@modularcore/modals/providers/in-memory';

const provider = createInMemoryProvider({
  modals: [
    {
      id: 'welcome',
      type: 'top-banner',
      message: 'Welcome! 20% off today.',
      trigger: { type: 'delay', value: 2000 },
    },
  ],
});

function App() {
  const { state, dismiss } = useModals(provider, { path: window.location.pathname });
  return <ModalsRenderer state={state} onDismiss={dismiss} />;
}
```

## Basic usage (Svelte 5)

```svelte
<script lang="ts">
  import { createModals } from '@modularcore/modals/svelte';
  import ModalsRenderer from '@modularcore/modals/ui/svelte/ModalsRenderer.svelte';
  import { createInMemoryProvider } from '@modularcore/modals/providers/in-memory';

  const provider = createInMemoryProvider({ modals: [/* ... */] });
  const modals = createModals(provider, { path: '/' }); // must be called during component init
</script>

<ModalsRenderer state={modals.state} ondismiss={modals.dismiss} />
```

## Accessibility & responsive design

`modal`/`fullscreen` trap focus (Tab/Shift+Tab cycle, focus restored on close), close on Escape,
and expose `role="dialog" aria-modal="true"`. `top-banner`/`bottom-banner`/`slide-in`/`toast` use
`aria-live="polite"` (toast: `role="status"`) and never steal focus. Every type is mobile-first:
full-width/near-full-width on narrow viewports, no horizontal scroll, and transitions are skipped
when `prefers-reduced-motion` is set (checked via `ui/a11y/reduced-motion.ts`).

See `plans/260825-1940-modals-overlay-system/plan.md` for the full design, including the
responsive/a11y contract table per overlay type.
